/**
 * scene.js - High-Resolution Procedural Optical Test Scene Generator
 * 
 * Generates an ultra-crisp, high-contrast test target combining:
 * 1. ISO 12233 & USAF 1951 Resolution Targets (bars, lines, Siemens star)
 * 2. Astronomical point sources for Airy ring inspection
 * 3. Architectural landscape with fine edges, railings, brickwork, and antenna wires
 * 4. Micro-text at varying point sizes
 * 5. Defined coordinates for live contrast measurement
 */

(function (window) {
  'use strict';

  const SceneGenerator = {
    width: 800,
    height: 520,

    // Coordinates of fine-line resolution bars for dynamic contrast sampling
    contrastTargetRegion: {
      x: 650,
      y: 330,
      width: 100,
      height: 30,
      barPeriodPx: 6 // 3px white, 3px black lines
    },

    /**
     * Create and render the sharp baseline master image onto an offscreen canvas
     */
    createMasterSceneCanvas() {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Crisp rendering
      ctx.imageSmoothingEnabled = false;

      // 1. Background split: Left side architectural scene, Right side optical test chart
      this.drawBackground(ctx);

      // 2. Left side: Observatory & Cityscape with fine details
      this.drawLandscapeAndArchitecture(ctx);

      // 3. Optical Test Chart on right half
      this.drawResolutionChart(ctx);

      // 4. Fine text test section across bottom
      this.drawFineText(ctx);

      // 5. Astronomical point sources (stars) in sky
      this.drawPointSources(ctx);

      return canvas;
    },

    drawBackground(ctx) {
      // Dark scientific background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, this.width, this.height);

      // Deep twilight sky gradient for landscape (left side: x: 0 to 450)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 320);
      skyGrad.addColorStop(0, '#060a17');
      skyGrad.addColorStop(0.6, '#0f1c3f');
      skyGrad.addColorStop(1, '#1b2d5a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 460, 320);

      // Ground/terrace
      const groundGrad = ctx.createLinearGradient(0, 320, 0, 440);
      groundGrad.addColorStop(0, '#101726');
      groundGrad.addColorStop(1, '#080d16');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 320, 460, 120);

      // Right side chart background (Crisp neutral high-contrast laboratory plate)
      ctx.fillStyle = '#f5f7fa';
      ctx.fillRect(460, 0, this.width - 460, 440);

      // Dividing bezel
      ctx.strokeStyle = '#2b3955';
      ctx.lineWidth = 2;
      ctx.strokeRect(460, 0, this.width - 460, 440);
    },

    drawLandscapeAndArchitecture(ctx) {
      ctx.save();

      // Distant mountain ridge
      ctx.fillStyle = '#0b162c';
      ctx.beginPath();
      ctx.moveTo(0, 240);
      ctx.lineTo(80, 210);
      ctx.lineTo(160, 230);
      ctx.lineTo(240, 195);
      ctx.lineTo(340, 240);
      ctx.lineTo(460, 220);
      ctx.lineTo(460, 320);
      ctx.lineTo(0, 320);
      ctx.closePath();
      ctx.fill();

      // University Astronomical Observatory Building
      // Main rotunda & dome
      const obsX = 220;
      const obsBaseY = 320;
      
      // Observatory Wall with brick texture lines
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(obsX - 70, obsBaseY - 140, 140, 140);

      // Fine horizontal masonry joints (thin lines test)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      for (let y = obsBaseY - 135; y < obsBaseY; y += 7) {
        ctx.beginPath();
        ctx.moveTo(obsX - 70, y);
        ctx.lineTo(obsX + 70, y);
        ctx.stroke();
      }

      // Vertical brick stagger lines
      for (let y = obsBaseY - 135; y < obsBaseY; y += 14) {
        for (let x = obsX - 65; x < obsX + 70; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 7);
          ctx.stroke();
        }
      }

      // Large Arched Observation Window with delicate mullions
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(obsX, obsBaseY - 75, 30, Math.PI, 0, false);
      ctx.lineTo(obsX + 30, obsBaseY - 20);
      ctx.lineTo(obsX - 30, obsBaseY - 20);
      ctx.closePath();
      ctx.fill();

      // Fine window grilles (1px lines)
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      // Vertical central mullion
      ctx.beginPath();
      ctx.moveTo(obsX, obsBaseY - 105);
      ctx.lineTo(obsX, obsBaseY - 20);
      ctx.stroke();
      // Horizontal transoms
      for (let wy = obsBaseY - 80; wy < obsBaseY - 20; wy += 15) {
        ctx.beginPath();
        ctx.moveTo(obsX - 28, wy);
        ctx.lineTo(obsX + 28, wy);
        ctx.stroke();
      }

      // Copper Observation Dome
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(obsX, obsBaseY - 140, 68, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      // Dome slit shutter (dark opening)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(obsX - 12, obsBaseY - 208, 24, 68);

      // Telescope inside slit
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(obsX - 8, obsBaseY - 160);
      ctx.lineTo(obsX + 16, obsBaseY - 200);
      ctx.stroke();

      // Classical Balustrade / Railing on roof edge (fine vertical pickets)
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obsX - 80, obsBaseY - 140);
      ctx.lineTo(obsX + 80, obsBaseY - 140);
      ctx.moveTo(obsX - 80, obsBaseY - 152);
      ctx.lineTo(obsX + 80, obsBaseY - 152);
      ctx.stroke();

      for (let rx = obsX - 78; rx <= obsX + 78; rx += 4) {
        ctx.beginPath();
        ctx.moveTo(rx, obsBaseY - 140);
        ctx.lineTo(rx, obsBaseY - 152);
        ctx.stroke();
      }

      // Tall Communication / Radio Antenna Tower with fine guy-wires
      const antX = 80;
      const antY = 320;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      // Mast
      ctx.beginPath();
      ctx.moveTo(antX, antY);
      ctx.lineTo(antX, 70);
      ctx.stroke();

      // Lattice cross struts
      ctx.lineWidth = 1;
      for (let ay = antY; ay > 80; ay -= 16) {
        ctx.beginPath();
        ctx.moveTo(antX - 8, ay);
        ctx.lineTo(antX + 8, ay - 16);
        ctx.moveTo(antX + 8, ay);
        ctx.lineTo(antX - 8, ay - 16);
        ctx.stroke();
      }

      // Ultra-thin Guy Wires (crucial for seeing diffraction blur)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(antX, 100);
      ctx.lineTo(10, antY);
      ctx.moveTo(antX, 100);
      ctx.lineTo(150, antY);
      ctx.moveTo(antX, 160);
      ctx.lineTo(25, antY);
      ctx.moveTo(antX, 160);
      ctx.lineTo(135, antY);
      ctx.stroke();

      // Red blinking beacon at tower tip
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(antX, 68, 3, 0, Math.PI * 2);
      ctx.fill();

      // Foreground sharp trees / pine silhouettes
      ctx.fillStyle = '#070d18';
      this.drawConifer(ctx, 360, 320, 90, 35);
      this.drawConifer(ctx, 400, 320, 110, 45);
      this.drawConifer(ctx, 335, 320, 65, 25);

      ctx.restore();
    },

    drawConifer(ctx, x, baseY, height, width) {
      ctx.beginPath();
      ctx.moveTo(x, baseY - height);
      ctx.lineTo(x + width / 2, baseY);
      ctx.lineTo(x - width / 2, baseY);
      ctx.closePath();
      ctx.fill();
    },

    drawPointSources(ctx) {
      // Pinpoint artificial star / point source targets
      // Real cameras show beautiful Airy rings on these points at high f-stops!
      const stars = [
        { x: 130, y: 50, radius: 1.5, label: 'Star α' },
        { x: 280, y: 40, radius: 2.0, label: 'Star β' },
        { x: 380, y: 65, radius: 1.2, label: 'Star γ' },
        { x: 420, y: 35, radius: 2.2, label: 'Point P' },
        { x: 50,  y: 40, radius: 1.2, label: '' }
      ];

      stars.forEach(s => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow halo
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius + 1.5, 0, Math.PI * 2);
        ctx.stroke();

        if (s.label) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '9px monospace';
          ctx.fillText(s.label, s.x + 5, s.y - 4);
        }
      });
    },

    drawResolutionChart(ctx) {
      ctx.save();
      const chartX = 460;
      const chartWidth = this.width - chartX;

      // Header on chart plate
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      ctx.fillText('OPTICAL RESOLUTION TEST CHART', chartX + 15, 25);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText('ISO 12233 & USAF 1951 CALIBRATION STANDARD', chartX + 15, 40);

      // 1. Siemens Star (Siemens Stern) - standard optical target
      // Center at (545, 125), Radius 55
      this.drawSiemensStar(ctx, chartX + 85, 115, 50, 36);

      // 2. Concentric Rings Target
      this.drawConcentricRings(ctx, chartX + 245, 115, 45);

      // 3. USAF 1951 3-Bar Groups (Vertical & Horizontal resolution bars)
      this.drawUSAFBars(ctx, chartX + 20, 185);

      // 4. Slanted Edge for MTF testing
      this.drawSlantedEdge(ctx, chartX + 220, 185, 90, 70);

      // 5. Fine periodic Ronchi ruling bar target (Dedicated for live contrast metric!)
      this.drawContrastTarget(ctx);

      // 6. Coordinate alignment crosses in 4 corners of chart
      this.drawFiducialCross(ctx, chartX + 12, 15);
      this.drawFiducialCross(ctx, this.width - 15, 15);
      this.drawFiducialCross(ctx, chartX + 12, 425);
      this.drawFiducialCross(ctx, this.width - 15, 425);

      ctx.restore();
    },

    drawSiemensStar(ctx, cx, cy, radius, spokesCount) {
      ctx.save();
      ctx.fillStyle = '#000000';
      const angleStep = (2 * Math.PI) / spokesCount;

      for (let i = 0; i < spokesCount; i += 2) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, i * angleStep, (i + 1) * angleStep);
        ctx.closePath();
        ctx.fill();
      }

      // Outer bounding ring
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Siemens Star', cx, cy + radius + 14);
      ctx.restore();
    },

    drawConcentricRings(ctx, cx, cy, maxRadius) {
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      for (let r = 5; r <= maxRadius; r += 5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#1e293b';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Concentric Grating', cx, cy + maxRadius + 14);
      ctx.restore();
    },

    drawUSAFBars(ctx, startX, startY) {
      ctx.save();
      ctx.fillStyle = '#000000';

      // USAF 1951 pattern: Groups of 3 bars with aspect ratio 5:1
      const barDefs = [
        { width: 6, spacing: 6, length: 30, label: 'G-1' },
        { width: 4, spacing: 4, length: 22, label: 'G-2' },
        { width: 3, spacing: 3, length: 16, label: 'G-3' },
        { width: 2, spacing: 2, length: 12, label: 'G-4' },
        { width: 1, spacing: 1.5, length: 9, label: 'G-5' }
      ];

      let currX = startX;
      barDefs.forEach((def) => {
        // Horizontal 3-bar group
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(currX, startY + i * (def.width + def.spacing), def.length, def.width);
        }

        // Vertical 3-bar group adjacent
        const vertX = currX + def.length + 8;
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(vertX + i * (def.width + def.spacing), startY, def.width, def.length);
        }

        // Label
        ctx.fillStyle = '#475569';
        ctx.font = '8px monospace';
        ctx.fillText(def.label, currX, startY + 3 * (def.width + def.spacing) + 10);
        ctx.fillStyle = '#000000';

        currX += def.length + def.width * 3 + def.spacing * 2 + 16;
        if (currX > startX + 170) {
          currX = startX;
          startY += 48;
        }
      });

      ctx.restore();
    },

    drawSlantedEdge(ctx, x, y, w, h) {
      ctx.save();
      // Gray background box
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x, y, w, h);

      // Slanted black polygon (5° slant for ISO 12233 edge-spread MTF)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.45, y);
      ctx.lineTo(x + w * 0.55, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#1e293b';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Slanted Edge (MTF)', x + w / 2, y + h + 13);
      ctx.restore();
    },

    drawContrastTarget(ctx) {
      ctx.save();
      const region = this.contrastTargetRegion;

      // Container box
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(region.x - 4, region.y - 18, region.width + 8, region.height + 26);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(region.x - 4, region.y - 18, region.width + 8, region.height + 26);

      // Label above
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CONTRAST SAMPLING TARGET', region.x, region.y - 6);

      // Alternate black and white bars (3px white, 3px black = 6px period)
      // High frequency target sensitive to diffraction cutoff!
      const period = region.barPeriodPx;
      for (let x = 0; x < region.width; x += period) {
        // Black bar
        ctx.fillStyle = '#000000';
        ctx.fillRect(region.x + x, region.y, period / 2, region.height);
        // White bar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(region.x + x + period / 2, region.y, period / 2, region.height);
      }

      ctx.restore();
    },

    drawFiducialCross(ctx, x, y) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    },

    drawFineText(ctx) {
      ctx.save();
      // Bottom panel for fine typography test
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 440, this.width, 80);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 440, this.width, 80);

      // Title & specimen
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText('DIFFRACTION & RESOLVING POWER SPECIMEN', 20, 460);

      // 10pt text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText('10pt: Ray optics fails when aperture approaches light wavelength λ ≈ 550nm.', 20, 477);

      // 8pt text
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('8pt: Rayleigh Limit: θ = 1.22 λ / D. Airy Disk diameter: d = 2.44 λ N. Airy peak contains 83.8% energy.', 20, 492);

      // 6.5pt micro-text (will turn into complete soft blur at f/22!)
      ctx.font = '6.5px "Courier New", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('6.5pt Micro-Test: ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 • High-f/number diffraction limits optical MTF.', 20, 506);

      ctx.restore();
    }
  };

  window.SceneGenerator = SceneGenerator;
})(window);
