/**
 * diffraction-renderer.js - High-Performance Physics-Accurate Image Simulator
 * 
 * Implements real-time 2D Airy diffraction convolution:
 * - Uses WebGL fragment shader with Bessel J1(x) Airy PSF calculation when supported
 * - Provides optimized Canvas2D CPU fallback
 * - Renders a 16x zoom inset of an astronomical point source showing Airy rings
 */

(function (window) {
  'use strict';

  class DiffractionRenderer {
    constructor(canvas, masterCanvas) {
      this.canvas = canvas;
      this.masterCanvas = masterCanvas;
      this.width = masterCanvas.width;
      this.height = masterCanvas.height;
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      // Comparison mode state
      this.compareEnabled = false;
      this.compareFNumber = 4.0;
      this.splitRatio = 0.5; // Split bar position (0.0 to 1.0)
      this.isDraggingSplit = false;

      // Point source zoom region (Star β at (280, 40))
      this.zoomPoint = { x: 280, y: 40, size: 24 };

      // Initialize WebGL or 2D context
      this.initRenderer();
    }

    initRenderer() {
      // Try WebGL first for 60fps real-time diffraction shader
      try {
        const gl = this.canvas.getContext('webgl', { antialias: false, depth: false, preserveDrawingBuffer: true }) ||
                   this.canvas.getContext('experimental-webgl');
        if (gl) {
          this.gl = gl;
          this.initWebGL();
          this.mode = 'webgl';
          return;
        }
      } catch (e) {
        console.warn('WebGL init failed, using 2D fallback:', e);
      }

      // Fallback: Canvas 2D
      this.mode = '2d';
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    initWebGL() {
      const gl = this.gl;

      // Vertex shader: Full-screen quad
      const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;
        void main() {
          v_texCoord = (a_position + 1.0) * 0.5;
          v_texCoord.y = 1.0 - v_texCoord.y; // Flip Y for image coords
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      // Fragment shader: Exact Airy pattern convolution
      const fsSource = `
        precision mediump float;
        uniform sampler2D u_image;
        uniform vec2 u_texelSize;
        uniform float u_airyRadiusPx; // Radius of 1st dark ring (r0 = 1.22 * λ * N) in pixels
        varying vec2 v_texCoord;

        // First-order Bessel function of the first kind J1(x)
        float besselJ1(float x) {
          float ax = abs(x);
          if (ax < 0.0001) return 0.0;
          if (ax < 10.0) {
            float term = ax * 0.5;
            float sum = term;
            float xHalfSq = term * term;
            for (int m = 1; m < 14; m++) {
              float fm = float(m);
              term = -term * xHalfSq / (fm * (fm + 1.0));
              sum += term;
            }
            return x < 0.0 ? -sum : sum;
          } else {
            float ans = sqrt(0.63661977 / ax) * cos(ax - 2.35619449);
            return x < 0.0 ? -ans : ans;
          }
        }

        // Normalized Airy intensity I(x) = [2 * J1(x) / x]^2
        float airyIntensity(float x) {
          if (abs(x) < 0.002) return 1.0 - 0.25 * x * x;
          float j1 = besselJ1(x);
          float val = (2.0 * j1) / x;
          return val * val;
        }

        void main() {
          // If airy radius is sub-pixel (< 0.6px, e.g. wide apertures like f/1.4 - f/2.0),
          // diffraction limit is below sensor pixel pitch; image is virtually sharp.
          if (u_airyRadiusPx < 0.6) {
            gl_FragColor = texture2D(u_image, v_texCoord);
            return;
          }

          vec4 colorSum = vec4(0.0);
          float weightSum = 0.0;
          
          // Effective kernel radius covers central disk and reaches into first diffraction ring
          float maxR = min(ceil(u_airyRadiusPx * 1.5), 11.0);
          
          // Concentric grid sampling with radial Airy weighting
          for (float dy = -11.0; dy <= 11.0; dy += 1.0) {
            if (abs(dy) > maxR) continue;
            for (float dx = -11.0; dx <= 11.0; dx += 1.0) {
              if (abs(dx) > maxR) continue;

              float rPx = sqrt(dx * dx + dy * dy);
              
              // Scale to Airy parameter x = 3.8317 * (r / r0)
              float x = 3.831706 * (rPx / max(0.4, u_airyRadiusPx));
              float weight = airyIntensity(x);

              // Smooth outer taper to eliminate hard cutoff ringing
              if (rPx > maxR * 0.8) {
                float taper = 0.5 * (1.0 + cos(3.14159265 * (rPx - maxR * 0.8) / (maxR * 0.2 + 0.01)));
                weight *= max(0.0, taper);
              }

              vec2 offset = vec2(dx, dy) * u_texelSize;
              vec4 sampleCol = texture2D(u_image, v_texCoord + offset);
              colorSum += sampleCol * weight;
              weightSum += weight;
            }
          }

          gl_FragColor = colorSum / max(0.0001, weightSum);
        }
      `;

      // Helper to compile shaders
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.error(gl.getShaderInfoLog(s));
        }
        return s;
      };

      const vs = compile(gl.VERTEX_SHADER, vsSource);
      const fs = compile(gl.FRAGMENT_SHADER, fsSource);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.useProgram(program);
      this.program = program;

      // Quad geometry
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]), gl.STATIC_DRAW);

      const aPosition = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      this.uAiryRadius = gl.getUniformLocation(program, 'u_airyRadiusPx');
      this.uTexelSize = gl.getUniformLocation(program, 'u_texelSize');
      this.uImage = gl.getUniformLocation(program, 'u_image');
      gl.uniform1i(this.uImage, 0);
      gl.uniform2f(this.uTexelSize, 1.0 / this.width, 1.0 / this.height);

      // Create texture from master scene canvas
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.masterCanvas);

      // Also create an offscreen buffer for comparison renders
      this.compareCanvas = document.createElement('canvas');
      this.compareCanvas.width = this.width;
      this.compareCanvas.height = this.height;
    }

    /**
     * Update texture if master canvas changes
     */
    updateTexture() {
      if (this.mode === 'webgl' && this.gl && this.texture) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.masterCanvas);
      }
    }

    /**
     * Compute Airy disk radius in simulation pixel units based on physical parameters
     */
    getAiryRadiusInPixels(fNumber) {
      const lambdaUm = window.Physics.wavelengthNm / 1000.0;
      const pixelPitchUm = window.Physics.pixelPitchUm;
      // Physical Airy radius: r0 = 1.22 * λ * N
      const r0Um = 1.22 * lambdaUm * fNumber;
      // Visual scale factor: 1.1x provides accurate sensor pixel representation
      return (r0Um / pixelPitchUm) * 1.1;
    }

    /**
     * Render the diffraction-simulated image
     */
    render(fNumber, zoomCanvas) {
      const airyRadiusPx = this.getAiryRadiusInPixels(fNumber);

      if (this.mode === 'webgl') {
        this.renderWebGL(airyRadiusPx);
      } else {
        this.render2D(fNumber);
      }

      // Handle split-screen comparison if enabled
      if (this.compareEnabled) {
        this.renderComparisonOverlay();
      } else if (this.overlayCanvas) {
        const oCtx = this.overlayCanvas.getContext('2d');
        oCtx.clearRect(0, 0, this.width, this.height);
      }

      // Render high-power point-source zoom inset if provided
      if (zoomCanvas) {
        this.renderPointSourceZoom(zoomCanvas, fNumber);
      }

    }

    renderWebGL(airyRadiusPx) {
      const gl = this.gl;
      gl.viewport(0, 0, this.width, this.height);
      gl.useProgram(this.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1f(this.uAiryRadius, airyRadiusPx);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /**
     * Canvas2D fallback convolution
     */
    render2D(fNumber) {
      const ctx = this.ctx;
      const kernelInfo = window.Physics.createAiryKernel(1.1);
      const k = kernelInfo.kernel;
      const kRadius = kernelInfo.radius;
      const kSize = kernelInfo.size;

      // If kernel radius is 1 and center is dominant (f/1.4 - f/2), just copy master
      if (kRadius <= 1 && fNumber < 2.5) {
        ctx.drawImage(this.masterCanvas, 0, 0);
        return;
      }

      // Read source pixels
      const mCtx = this.masterCanvas.getContext('2d');
      const srcData = mCtx.getImageData(0, 0, this.width, this.height);
      const src = srcData.data;
      const dstData = ctx.createImageData(this.width, this.height);
      const dst = dstData.data;

      const w = this.width;
      const h = this.height;

      // Convolve
      for (let y = 0; y < h; y++) {
        const yOffset = y * w;
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0;
          let kIdx = 0;

          for (let ky = -kRadius; ky <= kRadius; ky++) {
            const py = Math.min(h - 1, Math.max(0, y + ky));
            const rowOffset = py * w;
            for (let kx = -kRadius; kx <= kRadius; kx++) {
              const px = Math.min(w - 1, Math.max(0, x + kx));
              const pIdx = (rowOffset + px) * 4;
              const kw = k[kIdx++];
              r += src[pIdx] * kw;
              g += src[pIdx + 1] * kw;
              b += src[pIdx + 2] * kw;
            }
          }

          const dstIdx = (yOffset + x) * 4;
          dst[dstIdx] = r;
          dst[dstIdx + 1] = g;
          dst[dstIdx + 2] = b;
          dst[dstIdx + 3] = 255;
        }
      }

      ctx.putImageData(dstData, 0, 0);
    }

    /**
     * Render the side-by-side / split curtain comparison
     */
    renderComparisonOverlay() {
      // Split coordinate
      const splitX = Math.floor(this.width * this.splitRatio);

      // Render the comparison f-stop onto temporary canvas
      const compAiryRadius = this.getAiryRadiusInPixels(this.compareFNumber);
      
      // Create comparison snapshot
      const compCanvas = this.compareCanvas;
      const compCtx = compCanvas.getContext('2d');

      if (this.mode === 'webgl') {
        const gl = this.gl;
        // First draw comparison to canvas
        gl.uniform1f(this.uAiryRadius, compAiryRadius);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        compCtx.drawImage(this.canvas, 0, 0);

        // Then redraw current f-number to canvas
        const currentAiryRadius = this.getAiryRadiusInPixels(window.Physics.fNumber);
        gl.uniform1f(this.uAiryRadius, currentAiryRadius);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Draw the split overlay using 2D context or overlay layer
      // We draw the comparison right-hand side onto an overlay canvas or directly
      // In our UI, we have a split-view overlay canvas
      if (this.overlayCanvas) {
        const oCtx = this.overlayCanvas.getContext('2d');
        oCtx.clearRect(0, 0, this.width, this.height);

        // Right side: comparison image
        oCtx.save();
        oCtx.beginPath();
        oCtx.rect(splitX, 0, this.width - splitX, this.height);
        oCtx.clip();
        oCtx.drawImage(compCanvas, 0, 0);
        oCtx.restore();

        // Divider line
        oCtx.strokeStyle = '#00f0ff';
        oCtx.lineWidth = 3;
        oCtx.beginPath();
        oCtx.moveTo(splitX, 0);
        oCtx.lineTo(splitX, this.height);
        oCtx.stroke();

        // Divider handle pill
        oCtx.fillStyle = '#00f0ff';
        oCtx.beginPath();
        oCtx.arc(splitX, this.height / 2, 16, 0, Math.PI * 2);
        oCtx.fill();

        oCtx.fillStyle = '#0a0f1d';
        oCtx.font = 'bold 12px sans-serif';
        oCtx.textAlign = 'center';
        oCtx.textBaseline = 'middle';
        oCtx.fillText('⬌', splitX, this.height / 2);

        // Labels
        oCtx.fillStyle = 'rgba(10, 15, 29, 0.85)';
        oCtx.fillRect(10, 10, 170, 32);
        oCtx.strokeStyle = '#38bdf8';
        oCtx.lineWidth = 1;
        oCtx.strokeRect(10, 10, 170, 32);
        oCtx.fillStyle = '#38bdf8';
        oCtx.font = 'bold 12px monospace';
        oCtx.textAlign = 'left';
        oCtx.fillText(`CURRENT: f/${window.Physics.fNumber.toFixed(1)}`, 18, 30);

        oCtx.fillStyle = 'rgba(10, 15, 29, 0.85)';
        oCtx.fillRect(this.width - 180, 10, 170, 32);
        oCtx.strokeStyle = '#a855f7';
        oCtx.strokeRect(this.width - 180, 10, 170, 32);
        oCtx.fillStyle = '#c084fc';
        oCtx.fillText(`COMPARE: f/${this.compareFNumber.toFixed(1)}`, this.width - 172, 30);
      }
    }

    /**
     * Render the high-magnification point-source zoom inset (Airy rings visualization)
     */
    renderPointSourceZoom(zoomCanvas, fNumber) {
      const zCtx = zoomCanvas.getContext('2d');
      const zw = zoomCanvas.width;
      const zh = zoomCanvas.height;
      const cx = zw / 2;
      const cy = zh / 2;

      // Dark background with reticle
      zCtx.fillStyle = '#030712';
      zCtx.fillRect(0, 0, zw, zh);

      // Reticle grid lines
      zCtx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      zCtx.lineWidth = 1;
      for (let x = 0; x <= zw; x += 20) {
        zCtx.beginPath();
        zCtx.moveTo(x, 0);
        zCtx.lineTo(x, zh);
        zCtx.stroke();
      }
      for (let y = 0; y <= zh; y += 20) {
        zCtx.beginPath();
        zCtx.moveTo(0, y);
        zCtx.lineTo(zw, y);
        zCtx.stroke();
      }

      // Physics calculation for Airy radius in zoom display pixels
      // In zoom canvas, let 1 pixel on the sensor = 8 display pixels (8x magnification)
      const zoomScale = 8.0;
      const lambdaUm = window.Physics.wavelengthNm / 1000.0;
      const airyRadiusUm = 1.22 * lambdaUm * fNumber;
      const airyRadiusPx = (airyRadiusUm / window.Physics.pixelPitchUm) * zoomScale;

      // Render the true 2D Airy intensity pattern analytically on zoom canvas
      const imgData = zCtx.createImageData(zw, zh);
      const data = imgData.data;

      // Wavelength color mapping (RGB tint for chosen wavelength)
      const rgb = this.wavelengthToRGB(window.Physics.wavelengthNm);

      for (let y = 0; y < zh; y++) {
        const dy = y - cy;
        const row = y * zw;
        for (let x = 0; x < zw; x++) {
          const dx = x - cx;
          const distPx = Math.sqrt(dx * dx + dy * dy);

          // x parameter for Airy equation: x = 3.8317 * (dist / airyRadius)
          const xParam = 3.831706 * (distPx / Math.max(0.5, airyRadiusPx));
          const intensity = window.Physics.getAiryIntensityAtRadiusUm(
            (distPx / zoomScale) * window.Physics.pixelPitchUm
          );

          // Gamma compression for visible Airy rings (Airy 1st ring is only 1.75% of peak;
          // photographic sensors and human eyes see it via log/gamma response)
          const visualIntensity = Math.pow(Math.max(0, intensity), 0.45);

          const idx = (row + x) * 4;
          data[idx] = Math.min(255, Math.floor(rgb.r * visualIntensity * 255));
          data[idx + 1] = Math.min(255, Math.floor(rgb.g * visualIntensity * 255));
          data[idx + 2] = Math.min(255, Math.floor(rgb.b * visualIntensity * 255));
          data[idx + 3] = 255;
        }
      }
      zCtx.putImageData(imgData, 0, 0);

      // Draw Rayleigh radius caliper ring
      zCtx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      zCtx.lineWidth = 1.5;
      zCtx.setLineDash([4, 4]);
      zCtx.beginPath();
      zCtx.arc(cx, cy, airyRadiusPx, 0, Math.PI * 2);
      zCtx.stroke();
      zCtx.setLineDash([]);

      // Reticle crosshair at center
      zCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      zCtx.beginPath();
      zCtx.moveTo(cx - 8, cy);
      zCtx.lineTo(cx + 8, cy);
      zCtx.moveTo(cx, cy - 8);
      zCtx.lineTo(cx, cy + 8);
      zCtx.stroke();

      // Inset HUD text
      zCtx.fillStyle = '#00f0ff';
      zCtx.font = 'bold 10px monospace';
      zCtx.fillText(`AIRY DISK INSET (20x)`, 8, 16);
      zCtx.fillStyle = '#94a3b8';
      zCtx.font = '9px monospace';
      zCtx.fillText(`d = ${(airyRadiusUm * 2).toFixed(1)} μm`, 8, 29);
      zCtx.fillText(`1st Min: r₀ = ${airyRadiusUm.toFixed(1)} μm`, 8, 41);
    }

    /**
     * Convert wavelength in nm to approximate RGB color
     */
    wavelengthToRGB(wavelength) {
      let r = 0, g = 0, b = 0;
      if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380);
        b = 1.0;
      } else if (wavelength >= 440 && wavelength < 490) {
        g = (wavelength - 440) / (490 - 440);
        b = 1.0;
      } else if (wavelength >= 490 && wavelength < 510) {
        g = 1.0;
        b = -(wavelength - 510) / (510 - 490);
      } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510);
        g = 1.0;
      } else if (wavelength >= 580 && wavelength < 645) {
        r = 1.0;
        g = -(wavelength - 645) / (645 - 580);
      } else if (wavelength >= 645 && wavelength <= 750) {
        r = 1.0;
      } else {
        r = 0.5; g = 1.0; b = 0.5;
      }
      return { r: r, g: g, b: b };
    }


  }

  window.DiffractionRenderer = DiffractionRenderer;
})(window);
