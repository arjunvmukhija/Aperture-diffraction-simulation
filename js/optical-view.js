/**
 * optical-view.js - Mode 2: Outside Camera / Optical System Cross-Section Visualization
 * 
 * Renders an animated, interactive cutaway diagram of a camera:
 * 1. Object outside camera emitting light
 * 2. Incident light rays (cyan/blue) entering camera lens
 * 3. Optical glass elements (achromatic doublet with refraction)
 * 4. Adjustable mechanical iris diaphragm (side cross-section blades)
 * 5. Diffraction wavefronts (Huygens-Fresnel wavelets & diffraction cone)
 * 6. Camera sensor plane with formed point-spread spot
 * 7. Inset: Front view of physical iris diaphragm with 9 animated blades
 */

(function (window) {
  'use strict';

  class OpticalSystemView {
    constructor(canvas, insetApertureCanvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.insetAperture = insetApertureCanvas;

      this.width = canvas.width;
      this.height = canvas.height;

      // Animation parameters
      this.animPhase = 0;
      this.isPlaying = true;
      this.animSpeed = 1.0;
      this.lastTimestamp = performance.now();

      // Optical system geometry in canvas coordinates
      this.setupGeometry();
    }

    setupGeometry() {
      // System layout coordinates along optical axis (Y = height / 2)
      this.optAxisY = this.height * 0.48;
      
      this.objectX = 50;              // Light emitter object outside camera
      this.lensFrontX = 220;          // Front lens element
      this.lensBackX = 310;           // Rear lens element
      this.apertureX = 360;           // Iris diaphragm plane
      this.sensorX = 660;             // Image sensor plane at back of camera

      // Camera body chassis dimensions
      this.cameraBody = {
        topY: this.optAxisY - 145,
        bottomY: this.optAxisY + 145,
        mountX: 300,
        backX: 710,
        gripX: 720
      };

      // Maximum physical aperture radius in canvas pixels
      this.maxApertureRadiusPx = 70; // Represents wide aperture (f/1.4)
      this.minApertureRadiusPx = 5;  // Represents narrow aperture (f/22)
    }

    /**
     * Map physical f-number to visual aperture opening radius in diagram
     */
    getVisualApertureRadius(fNumber) {
      // D is proportional to 1 / fNumber
      // f/1.4 -> ~65px, f/22 -> ~5.5px
      const normalizedD = (50.0 / fNumber) / (50.0 / 1.4); // 1.0 at f/1.4, ~0.063 at f/22
      return this.minApertureRadiusPx + normalizedD * (this.maxApertureRadiusPx - this.minApertureRadiusPx);
    }

    /**
     * Main animation loop step
     */
    update(timestamp) {
      const dt = Math.min(50, timestamp - this.lastTimestamp);
      this.lastTimestamp = timestamp;

      if (this.isPlaying) {
        this.animPhase = (this.animPhase + dt * 0.002 * this.animSpeed) % 1.0;
      }

      const fNumber = window.Physics.fNumber;

      // 1. Draw main camera cutaway cross-section
      this.drawMainCutaway(fNumber);

      // 2. Draw Inset A: Front view of physical iris
      this.drawInsetAperture(fNumber);

    }

    drawMainCutaway(fNumber) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const cy = this.optAxisY;
      const aptRadius = this.getVisualApertureRadius(fNumber);

      ctx.clearRect(0, 0, w, h);

      // 1. Outer dark laboratory background
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, w, h);

      // Subtle engineering grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 2. Optical axis (dashed cyan centerline)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(20, cy);
      ctx.lineTo(w - 20, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.font = '9px monospace';
      ctx.fillText('OPTICAL AXIS', 30, cy - 8);

      // 3. Camera Body & Lens Barrel Cutaway (metallic shell)
      this.drawCameraChassis(ctx, cy, aptRadius);

      // 4. Optical Glass Elements (Doublet lenses with AR coating)
      this.drawGlassLenses(ctx, cy);

      // 5. Mechanical Iris Diaphragm (Cross section blades)
      this.drawDiaphragmBlades(ctx, cy, aptRadius);

      // 6. Sensor plane at back of camera
      this.drawSensorPlane(ctx, cy, fNumber);

      // 7. Light Rays & Wavefront Simulation
      this.drawLightPropagation(ctx, cy, aptRadius, fNumber);

      // 8. Dynamic Status Banner
      this.drawStatusBanner(ctx, fNumber);

      // 9. Component Callout Labels & Calipers
      this.drawLabelsAndCalipers(ctx, cy, aptRadius, fNumber);
    }

    drawCameraChassis(ctx, cy, aptRadius) {
      ctx.save();

      // Camera body cross-section (dark gunmetal matte chassis)
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;

      // Outer camera shell
      ctx.beginPath();
      // Lens barrel top
      ctx.moveTo(this.lensFrontX - 10, cy - 100);
      ctx.lineTo(this.cameraBody.mountX, cy - 100);
      // Lens mount bayonet flange
      ctx.lineTo(this.cameraBody.mountX, cy - 130);
      // Top plate / pentaprism hump
      ctx.lineTo(480, cy - 130);
      ctx.lineTo(520, cy - 165); // EVF hump peak
      ctx.lineTo(580, cy - 165);
      ctx.lineTo(620, cy - 130);
      ctx.lineTo(this.cameraBody.backX, cy - 130);
      // Back of camera (LCD display)
      ctx.lineTo(this.cameraBody.backX, cy + 130);
      // Bottom plate
      ctx.lineTo(this.cameraBody.mountX, cy + 130);
      ctx.lineTo(this.cameraBody.mountX, cy + 100);
      // Lens barrel bottom
      ctx.lineTo(this.lensFrontX - 10, cy + 100);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner optical chamber cavity (internal baffling to prevent stray reflections)
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      // Top inner cavity
      ctx.moveTo(this.lensFrontX, cy - 90);
      ctx.lineTo(this.cameraBody.backX - 20, cy - 90);
      ctx.lineTo(this.cameraBody.backX - 20, cy + 90);
      ctx.lineTo(this.lensFrontX, cy + 90);
      ctx.closePath();
      ctx.fill();

      // Lens barrel internal ridges (anti-reflective threading)
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      for (let x = this.lensFrontX + 20; x < this.sensorX - 30; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 90);
        ctx.lineTo(x, cy - 82);
        ctx.moveTo(x, cy + 90);
        ctx.lineTo(x, cy + 82);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawGlassLenses(ctx, cy) {
      const ctx2 = this.ctx;
      ctx2.save();

      // Front Biconvex Element
      const lx1 = this.lensFrontX;
      const grad1 = ctx2.createLinearGradient(lx1, cy - 80, lx1 + 50, cy + 80);
      grad1.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      grad1.addColorStop(0.5, 'rgba(147, 197, 253, 0.45)');
      grad1.addColorStop(1, 'rgba(56, 189, 248, 0.20)');
      ctx2.fillStyle = grad1;
      ctx2.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx2.lineWidth = 2;

      ctx2.beginPath();
      ctx2.arc(lx1 + 45, cy, 95, Math.PI * 0.65, Math.PI * 1.35, false); // Front convex surface
      ctx2.arc(lx1 - 15, cy, 95, -Math.PI * 0.35, Math.PI * 0.35, false); // Rear convex surface
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();

      // Rear Meniscus Element
      const lx2 = this.lensBackX;
      const grad2 = ctx2.createLinearGradient(lx2, cy - 75, lx2 + 35, cy + 75);
      grad2.addColorStop(0, 'rgba(129, 140, 248, 0.22)');
      grad2.addColorStop(0.5, 'rgba(199, 210, 254, 0.40)');
      grad2.addColorStop(1, 'rgba(129, 140, 248, 0.18)');
      ctx2.fillStyle = grad2;
      ctx2.strokeStyle = 'rgba(129, 140, 248, 0.75)';

      ctx2.beginPath();
      ctx2.arc(lx2 + 35, cy, 85, Math.PI * 0.68, Math.PI * 1.32, false);
      ctx2.arc(lx2 + 15, cy, 85, -Math.PI * 0.32, Math.PI * 0.32, false);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();

      // AR Coating highlight reflections
      ctx2.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.arc(lx1 + 45, cy, 93, Math.PI * 0.78, Math.PI * 0.88, false);
      ctx2.stroke();

      ctx2.restore();
    }

    drawDiaphragmBlades(ctx, cy, aptRadius) {
      ctx.save();
      const ax = this.apertureX;
      const bladeW = 12;

      // Diaphragm mount ring
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(ax - 6, cy - 90, 12, 180);
      ctx.strokeRect(ax - 6, cy - 90, 12, 180);

      // Top mechanical blade
      const topGrad = ctx.createLinearGradient(ax - bladeW / 2, cy - 90, ax + bladeW / 2, cy - aptRadius);
      topGrad.addColorStop(0, '#475569');
      topGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = topGrad;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;

      // Draw top blade coming down to (cy - aptRadius)
      ctx.beginPath();
      ctx.moveTo(ax - bladeW / 2, cy - 85);
      ctx.lineTo(ax + bladeW / 2, cy - 85);
      ctx.lineTo(ax + 2, cy - aptRadius);
      ctx.lineTo(ax - 6, cy - aptRadius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom mechanical blade
      const btmGrad = ctx.createLinearGradient(ax - bladeW / 2, cy + aptRadius, ax + bladeW / 2, cy + 90);
      btmGrad.addColorStop(0, '#94a3b8');
      btmGrad.addColorStop(1, '#475569');
      ctx.fillStyle = btmGrad;

      // Draw bottom blade coming up to (cy + aptRadius)
      ctx.beginPath();
      ctx.moveTo(ax - 6, cy + aptRadius);
      ctx.lineTo(ax + 2, cy + aptRadius);
      ctx.lineTo(ax + bladeW / 2, cy + 85);
      ctx.lineTo(ax - bladeW / 2, cy + 85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing tips of aperture blades
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(ax - 2, cy - aptRadius, 2.5, 0, Math.PI * 2);
      ctx.arc(ax - 2, cy + aptRadius, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawSensorPlane(ctx, cy, fNumber) {
      ctx.save();
      const sx = this.sensorX;

      // Sensor heatsink / substrate
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.fillRect(sx - 4, cy - 70, 8, 140);
      ctx.strokeRect(sx - 4, cy - 70, 8, 140);

      // Gold wire bonds
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      for (let y = cy - 65; y <= cy + 65; y += 12) {
        ctx.beginPath();
        ctx.moveTo(sx + 4, y);
        ctx.lineTo(sx + 10, y + (y < cy ? -3 : 3));
        ctx.stroke();
      }

      // Silicon Sensor Active Area (Micro-lenses)
      const grad = ctx.createLinearGradient(sx - 4, cy - 60, sx, cy + 60);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.5, '#0ea5e9');
      grad.addColorStop(1, '#0369a1');
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 3, cy - 60, 4, 120);

      // Micro-lens pixel notches
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      for (let y = cy - 58; y <= cy + 58; y += 6) {
        ctx.beginPath();
        ctx.moveTo(sx - 3, y);
        ctx.lineTo(sx + 1, y);
        ctx.stroke();
      }

      // Point-Spread Spot Formed on Sensor:
      // At f/1.4, spot is a tight pinpoint! At f/22, spot spreads out into a wide Airy disk!
      const lambdaUm = window.Physics.wavelengthNm / 1000.0;
      const airyRadiusUm = 1.22 * lambdaUm * fNumber;
      // Map physical Airy radius to sensor spot radius on diagram (from 2px to 22px)
      const spotRadiusPx = Math.max(2.5, Math.min(26.0, (airyRadiusUm / 15.0) * 12.0));

      // Glow halo on sensor surface
      const spotGrad = ctx.createRadialGradient(sx - 2, cy, 0, sx - 2, cy, spotRadiusPx * 2.5);
      spotGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      spotGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.85)');
      spotGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.35)');
      spotGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(sx - 2, cy, spotRadiusPx * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // If diffraction is high (f/16 - f/22), draw visible Airy diffraction ring around the spot!
      if (fNumber >= 11) {
        const ringRadius = spotRadiusPx * 1.8;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx - 2, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawLightPropagation(ctx, cy, aptRadius, fNumber) {
      ctx.save();
      const ox = this.objectX;
      const lx = this.lensFrontX;
      const ax = this.apertureX;
      const sx = this.sensorX;

      // 1. Light source object on left (an illuminated arrow/pinpoint)
      this.drawLightSource(ctx, ox, cy);

      // 2. Incident Light Bundle (Rays from object entering lens)
      // Cyan glowing beam
      const numRays = 7;
      const phase = this.animPhase;

      for (let i = 0; i < numRays; i++) {
        const t = (i / (numRays - 1)) - 0.5; // -0.5 to +0.5
        const rayObjY = cy + t * 40;        // Ray origin at object
        const rayLensY = cy + t * 140;       // Ray impact at front lens

        // Ray path 1: Object to Lens
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ox + 10, rayObjY);
        ctx.lineTo(lx, rayLensY);
        ctx.stroke();

        // Traveling photon pulse along Ray 1
        const p1 = (phase + i * 0.15) % 1.0;
        const px1 = (ox + 10) + (lx - (ox + 10)) * p1;
        const py1 = rayObjY + (rayLensY - rayObjY) * p1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px1, py1, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Rays converging from Lens toward Aperture
      // Only rays that fit through the aperture opening pass through!
      for (let i = 0; i < numRays; i++) {
        const t = (i / (numRays - 1)) - 0.5;
        const rayLensY = cy + t * 140;
        const rayAptTargetY = cy + t * (aptRadius * 2.0); // target height at aperture

        const passesThrough = Math.abs(rayAptTargetY - cy) <= aptRadius;

        if (passesThrough) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(lx + 20, rayLensY);
          ctx.lineTo(ax, rayAptTargetY);
          ctx.stroke();

          // Traveling photon
          const p2 = (phase + i * 0.15 + 0.33) % 1.0;
          const px2 = (lx + 20) + (ax - (lx + 20)) * p2;
          const py2 = rayLensY + (rayAptTargetY - rayLensY) * p2;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px2, py2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Blocked ray hitting aperture diaphragm
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(lx + 20, rayLensY);
          ctx.lineTo(ax, rayAptTargetY);
          ctx.stroke();
        }
      }

      // 4. Diffraction Visualization after Aperture (ax to sx)
      // This is the core physics demonstration:
      // At wide aperture (f/1.4 - f/4): Geometric ray cone cleanly focuses to a tight point.
      // At narrow aperture (f/16 - f/22): Wavefront spreading, Huygens wavelets, and diffracted fringe envelope!
      this.drawPostApertureDiffraction(ctx, cy, ax, sx, aptRadius, fNumber, phase);

      ctx.restore();
    }

    drawLightSource(ctx, ox, cy) {
      // Glowing emitter target
      const glow = ctx.createRadialGradient(ox, cy, 0, ox, cy, 25);
      glow.addColorStop(0, 'rgba(0, 240, 255, 1.0)');
      glow.addColorStop(0.5, 'rgba(0, 240, 255, 0.4)');
      glow.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ox, cy, 25, 0, Math.PI * 2);
      ctx.fill();

      // Sharp central emitter point
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ox, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Object label
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LIGHT SOURCE', ox, cy - 35);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px monospace';
      ctx.fillText('(Object)', ox, cy - 23);
    }

    drawPostApertureDiffraction(ctx, cy, ax, sx, aptRadius, fNumber, phase) {
      // Geometric beam convergence cone
      ctx.save();

      // Calculate diffraction spread angle θ = 1.22 * λ / D
      // For visual clarity on screen, we scale diffraction spread so it's readily observable
      const lambdaUm = window.Physics.wavelengthNm / 1000.0;
      const D_mm = window.Physics.getApertureDiameterMm();
      const thetaRad = 1.22 * (lambdaUm * 1e-3) / D_mm;
      
      // Visual diffraction flare height at sensor
      // At f/1.4, flare is ~2px. At f/22, flare spreads to ~35px!
      const flareSensorHeight = Math.max(2.0, (fNumber / 22.0) * 36.0);

      // 1. Transmitted light cone fill (translucent cyan)
      const coneGrad = ctx.createLinearGradient(ax, cy, sx, cy);
      coneGrad.addColorStop(0, 'rgba(0, 240, 255, 0.20)');
      coneGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.15)');
      coneGrad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');
      ctx.fillStyle = coneGrad;

      ctx.beginPath();
      ctx.moveTo(ax, cy - aptRadius);
      ctx.lineTo(sx, cy - flareSensorHeight);
      ctx.lineTo(sx, cy + flareSensorHeight);
      ctx.lineTo(ax, cy + aptRadius);
      ctx.closePath();
      ctx.fill();

      // 2. Converging bounding rays
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.8;
      // Top boundary
      ctx.beginPath();
      ctx.moveTo(ax, cy - aptRadius);
      ctx.lineTo(sx, cy - flareSensorHeight);
      ctx.stroke();
      // Bottom boundary
      ctx.beginPath();
      ctx.moveTo(ax, cy + aptRadius);
      ctx.lineTo(sx, cy + flareSensorHeight);
      ctx.stroke();

      // 3. Central axial ray
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ax, cy);
      ctx.lineTo(sx, cy);
      ctx.stroke();

      // 4. Huygens Wavelet Ripples & Diffraction Fringes:
      // When aperture is small (f/8 to f/22), wave nature dominates!
      // Draw circular wave arcs bending around the knife edges of the aperture
      if (fNumber >= 5.6) {
        const waveCount = 5;
        const waveIntensity = Math.min(1.0, (fNumber - 4.0) / 16.0);

        for (let w = 0; w < waveCount; w++) {
          const wPhase = (phase + w / waveCount) % 1.0;
          const waveRadius = wPhase * (sx - ax) * 0.9 + 10;
          const alpha = (1.0 - wPhase) * waveIntensity * 0.45;

          // Upper blade Huygens wavelet arc
          ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(ax, cy - aptRadius, waveRadius, -Math.PI * 0.2, Math.PI * 0.4, false);
          ctx.stroke();

          // Lower blade Huygens wavelet arc
          ctx.beginPath();
          ctx.arc(ax, cy + aptRadius, waveRadius, -Math.PI * 0.4, Math.PI * 0.2, false);
          ctx.stroke();
        }

        // Secondary diffracted rays bending outward (fringes)
        if (fNumber >= 11) {
          const fringeAlpha = Math.min(0.6, (fNumber - 8.0) / 20.0);
          ctx.strokeStyle = `rgba(168, 85, 247, ${fringeAlpha})`;
          ctx.lineWidth = 1.0;
          ctx.setLineDash([4, 4]);

          // Upper diffracted fringe
          ctx.beginPath();
          ctx.moveTo(ax, cy - aptRadius);
          ctx.lineTo(sx, cy - flareSensorHeight * 1.8);
          ctx.stroke();

          // Lower diffracted fringe
          ctx.beginPath();
          ctx.moveTo(ax, cy + aptRadius);
          ctx.lineTo(sx, cy + flareSensorHeight * 1.8);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    }

    drawStatusBanner(ctx, fNumber) {
      ctx.save();
      const bannerY = 24;
      const isHighDiffraction = fNumber >= 11;

      // Glow box
      ctx.fillStyle = isHighDiffraction ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
      ctx.strokeStyle = isHighDiffraction ? '#ef4444' : '#10b981';
      ctx.lineWidth = 1.5;

      const bannerText = isHighDiffraction
        ? '⚠️ SMALL APERTURE — HIGH DIFFRACTION (AIRY DISK EXPANDS)'
        : '✓ LARGER APERTURE — LESS DIFFRACTION (TIGHT AIRY SPOT)';

      ctx.font = 'bold 12px "Segoe UI", monospace';
      const textWidth = ctx.measureText(bannerText).width;
      const boxW = textWidth + 36;
      const boxX = (this.width - boxW) / 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, bannerY - 14, boxW, 28, 6);
      } else {
        ctx.rect(boxX, bannerY - 14, boxW, 28);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHighDiffraction ? '#fca5a5' : '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bannerText, this.width / 2, bannerY);

      ctx.restore();
    }

    drawLabelsAndCalipers(ctx, cy, aptRadius, fNumber) {
      ctx.save();

      // 1. Aperture Diameter Caliper
      const ax = this.apertureX;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;

      // Top caliper tick
      ctx.beginPath();
      ctx.moveTo(ax - 18, cy - aptRadius);
      ctx.lineTo(ax - 28, cy - aptRadius);
      ctx.lineTo(ax - 28, cy + aptRadius);
      ctx.lineTo(ax - 18, cy + aptRadius);
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      const D_mm = window.Physics.getApertureDiameterMm();
      ctx.fillText(`D = ${D_mm.toFixed(2)} mm`, ax - 32, cy + 3);

      // 2. Component Labels
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';

      // Lens Elements label
      ctx.fillText('CAMERA LENS', (this.lensFrontX + this.lensBackX) / 2, cy + 120);
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText('(Doublet f=50mm)', (this.lensFrontX + this.lensBackX) / 2, cy + 132);

      // Iris Diaphragm label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('IRIS APERTURE', ax, cy - 110);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`f/${fNumber.toFixed(1)}`, ax, cy - 98);

      // Image Sensor label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('IMAGE SENSOR', this.sensorX, cy + 120);
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText('(Pixel Pitch 3.76μm)', this.sensorX, cy + 132);

      ctx.restore();
    }

    /**
     * Inset A: Front view of the physical iris diaphragm with 9 animated mechanical blades
     */
    drawInsetAperture(fNumber) {
      if (!this.insetAperture) return;
      const ctx = this.insetAperture.getContext('2d');
      const w = this.insetAperture.width;
      const h = this.insetAperture.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Metallic lens barrel mount ring
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Outer bezel ring
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 6, 0, Math.PI * 2);
      ctx.stroke();

      // Blade inner cavity
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 10, 0, Math.PI * 2);
      ctx.fill();

      // Iris opening radius
      const maxR = cx - 18;
      const minR = 6;
      const normalizedD = (50.0 / fNumber) / (50.0 / 1.4);
      const openR = minR + normalizedD * (maxR - minR);

      // 9 Mechanical curved blades
      const numBlades = 9;
      const rotationAngle = (1.0 - normalizedD) * 0.45; // Blades rotate inward as iris closes

      for (let i = 0; i < numBlades; i++) {
        const theta = (i * 2 * Math.PI) / numBlades + rotationAngle;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(theta);

        // Blade polygon
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(0, openR + 12, openR + 10, -0.4, 0.4, false);
        ctx.lineTo(maxR + 4, 10);
        ctx.lineTo(maxR + 4, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // Central circular clear aperture opening
      // Shows incoming light beam passing through
      const lightGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, openR);
      lightGrad.addColorStop(0, '#ffffff');
      lightGrad.addColorStop(0.7, '#38bdf8');
      lightGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, openR, 0, Math.PI * 2);
      ctx.fill();

      // Opening boundary glow
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, openR, 0, Math.PI * 2);
      ctx.stroke();

      // Caliper measurement overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cx - openR, cy);
      ctx.lineTo(cx + openR, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inset label
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('A: APERTURE OPENING', 6, 14);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px monospace';
      const D = window.Physics.getApertureDiameterMm();
      ctx.fillText(`D = ${D.toFixed(2)} mm`, 6, 26);
    }


  }

  window.OpticalSystemView = OpticalSystemView;
})(window);
