/**
 * app.js - Master Application Controller & UI Coordination
 * 
 * Synchronizes:
 * - Mode 1 (Camera View) and Mode 2 (Optical System View)
 * - Continuous aperture slider and discrete f-stop presets
 * - Live scientific measurement panel
 * - Wavelength and focal length controls
 * - Side-by-side sharpness comparison curtain
 */

(function (window) {
  'use strict';

  class App {
    constructor() {
      this.currentMode = 'camera'; // 'camera' or 'optical'

      this.initDOMElements();
      this.initSimulation();
      this.initEventListeners();
      this.startAnimationLoop();

      // Initial render at f/22 per specification
      this.updateAllViews();
    }

    initDOMElements() {
      // Mode buttons
      this.btnModeCamera = document.getElementById('btnModeCamera');
      this.btnModeOptical = document.getElementById('btnModeOptical');
      this.sectionCameraView = document.getElementById('sectionCameraView');
      this.sectionOpticalView = document.getElementById('sectionOpticalView');

      // Aperture slider & presets
      this.apertureSlider = document.getElementById('apertureSlider');
      this.presetBtns = document.querySelectorAll('.f-stop-chip');

      // Wavelength slider
      this.wavelengthSlider = document.getElementById('wavelengthSlider');
      this.wavelengthVal = document.getElementById('wavelengthVal');

      // Focal length selector
      this.focalLengthSelect = document.getElementById('focalLengthSelect');

      // Canvases
      this.cameraCanvas = document.getElementById('cameraViewCanvas');
      this.cameraOverlayCanvas = document.getElementById('cameraOverlayCanvas');
      this.zoomCanvas = document.getElementById('pointSourceZoomCanvas');
      
      this.opticalCanvas = document.getElementById('opticalSystemCanvas');
      this.insetAperture = document.getElementById('insetApertureCanvas');

      // Scientific measurement readouts
      this.readoutFNumber = document.getElementById('readoutFNumber');
      this.readoutFocalLength = document.getElementById('readoutFocalLength');
      this.readoutApertureDiameter = document.getElementById('readoutApertureDiameter');
      this.readoutWavelength = document.getElementById('readoutWavelength');
      this.readoutAiryDiameter = document.getElementById('readoutAiryDiameter');
      this.readoutAngularRes = document.getElementById('readoutAngularRes');
      this.readoutDiffractionLevel = document.getElementById('readoutDiffractionLevel');

      // Mode 1 Comparison UI
      this.btnCompareSharpness = document.getElementById('btnCompareSharpness');
      this.compareControls = document.getElementById('compareControls');
      this.compareFSelect = document.getElementById('compareFSelect');

      // Animation & Reset buttons
      this.btnPlayPause = document.getElementById('btnPlayPause');
      this.btnResetExperiment = document.getElementById('btnResetExperiment');

    }

    initSimulation() {
      // 1. Generate crisp master optical test target
      this.masterSceneCanvas = window.SceneGenerator.createMasterSceneCanvas();

      // 2. Initialize Diffraction Renderer for Mode 1
      this.diffractionRenderer = new window.DiffractionRenderer(this.cameraCanvas, this.masterSceneCanvas);
      this.diffractionRenderer.overlayCanvas = this.cameraOverlayCanvas;

      // 3. Initialize Optical System View for Mode 2
      this.opticalSystemView = new window.OpticalSystemView(
        this.opticalCanvas,
        this.insetAperture
      );

    }

    initEventListeners() {
      // Mode Switching
      this.btnModeCamera.addEventListener('click', () => this.switchMode('camera'));
      this.btnModeOptical.addEventListener('click', () => this.switchMode('optical'));

      // Continuous Aperture Slider
      // Slider values represent index in continuous log scale:
      // Value: 1.4 to 22.0
      this.apertureSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.Physics.setParameters({ fNumber: val });
        this.syncPresetButtons(val);
        this.updateAllViews();
      });

      // Discrete Preset Chips
      this.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const f = parseFloat(btn.getAttribute('data-f'));
          this.apertureSlider.value = f;
          window.Physics.setParameters({ fNumber: f });
          this.syncPresetButtons(f);
          this.updateAllViews();
        });
      });

      // Wavelength slider
      this.wavelengthSlider.addEventListener('input', (e) => {
        const wl = parseFloat(e.target.value);
        window.Physics.setParameters({ wavelengthNm: wl });
        if (this.wavelengthVal) this.wavelengthVal.textContent = `${wl.toFixed(0)} nm`;
        this.updateAllViews();
      });

      // Focal Length selector
      if (this.focalLengthSelect) {
        this.focalLengthSelect.addEventListener('change', (e) => {
          const fl = parseFloat(e.target.value);
          window.Physics.setParameters({ focalLengthMm: fl });
          this.updateAllViews();
        });
      }

      // Mode 1: Compare Sharpness Toggle
      this.btnCompareSharpness.addEventListener('click', () => {
        const active = !this.diffractionRenderer.compareEnabled;
        this.diffractionRenderer.compareEnabled = active;
        this.btnCompareSharpness.classList.toggle('active', active);
        if (this.compareControls) {
          this.compareControls.classList.toggle('hidden', !active);
        }
        if (!active && this.cameraOverlayCanvas) {
          const ctx = this.cameraOverlayCanvas.getContext('2d');
          ctx.clearRect(0, 0, this.cameraOverlayCanvas.width, this.cameraOverlayCanvas.height);
        }
        this.updateAllViews();
      });

      // Compare reference f-stop selector
      if (this.compareFSelect) {
        this.compareFSelect.addEventListener('change', (e) => {
          this.diffractionRenderer.compareFNumber = parseFloat(e.target.value);
          this.updateAllViews();
        });
      }

      // Dragging the comparison divider
      this.setupSplitDividerDrag();

      // Play / Pause Animation
      if (this.btnPlayPause) {
        this.btnPlayPause.addEventListener('click', () => {
          this.opticalSystemView.isPlaying = !this.opticalSystemView.isPlaying;
          this.btnPlayPause.textContent = this.opticalSystemView.isPlaying ? '⏸ Pause Wave' : '▶ Play Wave';
        });
      }

      // Reset Experiment
      this.btnResetExperiment.addEventListener('click', () => this.resetSimulation());


    }

    setupSplitDividerDrag() {
      const overlay = this.cameraOverlayCanvas;
      if (!overlay) return;

      const getRatioFromEvent = (e) => {
        const rect = overlay.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left);
        const x = clientX - rect.left;
        return Math.max(0.05, Math.min(0.95, x / rect.width));
      };

      const onStart = (e) => {
        if (!this.diffractionRenderer.compareEnabled) return;
        this.diffractionRenderer.isDraggingSplit = true;
        this.diffractionRenderer.splitRatio = getRatioFromEvent(e);
        this.updateAllViews();
      };

      const onMove = (e) => {
        if (this.diffractionRenderer.isDraggingSplit) {
          this.diffractionRenderer.splitRatio = getRatioFromEvent(e);
          this.updateAllViews();
        }
      };

      const onEnd = () => {
        this.diffractionRenderer.isDraggingSplit = false;
      };

      overlay.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);

      overlay.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);
    }

    switchMode(mode) {
      this.currentMode = mode;

      if (mode === 'camera') {
        this.btnModeCamera.classList.add('active');
        this.btnModeOptical.classList.remove('active');
        this.sectionCameraView.classList.remove('hidden');
        this.sectionOpticalView.classList.add('hidden');
      } else {
        this.btnModeCamera.classList.remove('active');
        this.btnModeOptical.classList.add('active');
        this.sectionCameraView.classList.add('hidden');
        this.sectionOpticalView.classList.remove('hidden');
      }

      this.updateAllViews();
    }

    syncPresetButtons(currentF) {
      this.presetBtns.forEach(btn => {
        const f = parseFloat(btn.getAttribute('data-f'));
        if (Math.abs(f - currentF) < 0.25) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    updateAllViews() {
      const fNumber = window.Physics.fNumber;

      // Render the camera view and update the scientific measurement panel.
      this.diffractionRenderer.render(fNumber, this.zoomCanvas);
      this.updateMeasurementPanel();
    }


    updateMeasurementPanel() {
      const p = window.Physics;
      const formatted = p.formatValues();

      if (this.readoutFNumber) this.readoutFNumber.textContent = formatted.fNumber;
      if (this.readoutFocalLength) this.readoutFocalLength.textContent = formatted.focalLength;
      if (this.readoutApertureDiameter) this.readoutApertureDiameter.textContent = formatted.apertureDiameter;
      if (this.readoutWavelength) this.readoutWavelength.textContent = formatted.wavelength;
      if (this.readoutAiryDiameter) this.readoutAiryDiameter.textContent = formatted.airyDiskDiameter;
      if (this.readoutAngularRes) this.readoutAngularRes.textContent = formatted.angularResolution;
      
      if (this.readoutDiffractionLevel) {
        this.readoutDiffractionLevel.textContent = formatted.diffractionSeverity;
        this.readoutDiffractionLevel.className = 'measurement-value ' + 
          (p.fNumber >= 16 ? 'text-red' : (p.fNumber >= 8 ? 'text-amber' : 'text-emerald'));
      }
    }

    startAnimationLoop() {
      const render = (timestamp) => {
        // Continuous wave ray animation for Optical System View
        if (this.currentMode === 'optical' || !this.sectionOpticalView.classList.contains('hidden')) {
          this.opticalSystemView.update(timestamp);
        }
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
    }

    resetSimulation() {
      // Reset back to initial default state: f/22, 50mm, 550nm, Mode 1
      window.Physics.setParameters({
        fNumber: 22.0,
        focalLengthMm: 50.0,
        wavelengthNm: 550.0,
        pixelPitchUm: 3.76
      });

      this.apertureSlider.value = 22.0;
      if (this.wavelengthSlider) this.wavelengthSlider.value = 550.0;
      if (this.wavelengthVal) this.wavelengthVal.textContent = '550 nm';
      if (this.focalLengthSelect) this.focalLengthSelect.value = '50';

      this.diffractionRenderer.compareEnabled = false;
      this.btnCompareSharpness.classList.remove('active');
      if (this.compareControls) this.compareControls.classList.add('hidden');

      this.syncPresetButtons(22.0);
      this.switchMode('camera');
      this.updateAllViews();
    }
  }

  // Boot on DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    window.AppInstance = new App();
  });
})(window);
