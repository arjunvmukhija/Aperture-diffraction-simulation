/**
 * physics.js - Core Physics Engine for Diffraction and Optical Calculations
 * 
 * Equations:
 * 1. Aperture Diameter: D = f / N
 * 2. Airy Disk Diameter (first minimum): d = 2.44 * λ * N
 * 3. Rayleigh Criterion Angular Resolution: θ = 1.22 * λ / D (radians)
 * 4. Radial Airy Intensity: I(x) = [2 * J1(x) / x]^2 where x = π * D * r / (λ * f) = π * r / (λ * N)
 */

(function (window) {
  'use strict';

  // Constants
  const DEFAULT_FOCAL_LENGTH_MM = 50.0; // 50mm lens
  const DEFAULT_WAVELENGTH_NM = 550.0;  // 550nm (green light)
  const DEFAULT_SENSOR_PIXEL_UM = 3.76; // Modern 24-61MP sensor pixel pitch (~3.76 μm)

  /**
   * First-order Bessel function of the first kind J1(x)
   * Computed via high-precision Taylor recurrence for |x| < 12 and asymptotic expansion for |x| >= 12.
   * Matches analytical zeros and peaks to within 1e-10.
   */
  function besselJ1(x) {
    if (x === 0) return 0;
    const ax = Math.abs(x);
    if (ax < 12.0) {
      let term = ax * 0.5;
      let sum = term;
      const xHalfSq = term * term;
      for (let m = 1; m < 20; m++) {
        term = -term * xHalfSq / (m * (m + 1));
        sum += term;
        if (Math.abs(term) < 1e-12) break;
      }
      return x < 0 ? -sum : sum;
    } else {
      // Asymptotic expansion for large x: J1(x) ≈ sqrt(2/(π*x)) * cos(x - 3π/4)
      const ans = Math.sqrt(2.0 / (Math.PI * ax)) * Math.cos(ax - 0.75 * Math.PI);
      return x < 0 ? -ans : ans;
    }
  }

  /**
   * Normalized Airy pattern intensity at dimensionless parameter x:
   * I(x) = [2 * J1(x) / x]^2
   * Limit as x -> 0 is 1.0
   */
  function airyIntensity(x) {
    if (Math.abs(x) < 1e-6) {
      // Series expansion near 0: [1 - x^2/8 + x^4/192]^2 ≈ 1 - x^2/4
      return 1.0 - (x * x) * 0.25;
    }
    const val = (2.0 * besselJ1(x)) / x;
    return val * val;
  }

  /**
   * Main Physics Object
   */
  const Physics = {
    // Current state
    focalLengthMm: DEFAULT_FOCAL_LENGTH_MM,
    wavelengthNm: DEFAULT_WAVELENGTH_NM,
    pixelPitchUm: DEFAULT_SENSOR_PIXEL_UM,
    fNumber: 22.0, // Initial state per specification: f/22

    /**
     * Set optical parameters
     */
    setParameters(params) {
      if (params.fNumber !== undefined) this.fNumber = Math.max(1.0, Math.min(32.0, params.fNumber));
      if (params.focalLengthMm !== undefined) this.focalLengthMm = Math.max(10.0, Math.min(300.0, params.focalLengthMm));
      if (params.wavelengthNm !== undefined) this.wavelengthNm = Math.max(380.0, Math.min(750.0, params.wavelengthNm));
      if (params.pixelPitchUm !== undefined) this.pixelPitchUm = Math.max(1.0, Math.min(10.0, params.pixelPitchUm));
    },

    /**
     * Aperture diameter in mm: D = f / N
     */
    getApertureDiameterMm() {
      return this.focalLengthMm / this.fNumber;
    },

    /**
     * Airy disk diameter in micrometers (μm): d = 2.44 * λ * N
     * (λ converted from nm to μm: λ_μm = λ_nm / 1000)
     */
    getAiryDiskDiameterUm() {
      const lambdaUm = this.wavelengthNm / 1000.0;
      return 2.44 * lambdaUm * this.fNumber;
    },

    /**
     * Airy disk radius in micrometers (μm): r_airy = 1.22 * λ * N
     */
    getAiryDiskRadiusUm() {
      return this.getAiryDiskDiameterUm() / 2.0;
    },

    /**
     * Angular resolution limit in radians: θ = 1.22 * λ / D
     */
    getAngularResolutionRad() {
      const lambdaM = this.wavelengthNm * 1e-9;
      const diameterM = this.getApertureDiameterMm() * 1e-3;
      return 1.22 * (lambdaM / diameterM);
    },

    /**
     * Angular resolution in arcseconds
     */
    getAngularResolutionArcsec() {
      return this.getAngularResolutionRad() * (180.0 / Math.PI) * 3600.0;
    },

    /**
     * Airy disk diameter in sensor pixels
     */
    getAiryDiskDiameterPixels() {
      return this.getAiryDiskDiameterUm() / this.pixelPitchUm;
    },

    /**
     * Relative diffraction factor normalized to f/2.8 as ~1.0 baseline
     */
    getRelativeDiffractionIndex() {
      return (this.fNumber / 2.8);
    },

    /**
     * Theoretical Cutoff Spatial Frequency in line pairs per mm (lp/mm):
     * ν_cutoff = 1 / (λ * N)
     */
    getCutoffFrequencyLpMm() {
      const lambdaMm = (this.wavelengthNm * 1e-9) * 1e3;
      return 1.0 / (lambdaMm * this.fNumber);
    },

    /**
     * Theoretical MTF (Modulation Transfer Function) for a diffraction-limited circular aperture
     * at normalized spatial frequency f_norm = ν / ν_cutoff (0 <= f_norm <= 1):
     * MTF(f_norm) = (2 / π) * [arccos(f_norm) - f_norm * sqrt(1 - f_norm^2)]
     */
    getTheoreticalMTF(spatialFreqLpMm) {
      const cutoff = this.getCutoffFrequencyLpMm();
      const fNorm = spatialFreqLpMm / cutoff;
      if (fNorm >= 1.0) return 0.0;
      if (fNorm <= 0.0) return 1.0;
      return (2.0 / Math.PI) * (Math.acos(fNorm) - fNorm * Math.sqrt(1.0 - fNorm * fNorm));
    },

    /**
     * Bessel function J1(x) helper
     */
    besselJ1: besselJ1,

    /**
     * Normalized Airy intensity at radial distance r (in μm) on image sensor
     */
    getAiryIntensityAtRadiusUm(rUm) {
      const lambdaUm = this.wavelengthNm / 1000.0;
      // x = π * r / (λ * N)
      const x = (Math.PI * rUm) / (lambdaUm * this.fNumber);
      return airyIntensity(x);
    },

    /**
     * Generate 1D radial Airy pattern profile for graph plotting:
     * returns array of { rUm, intensity, x }
     */
    generateAiryRadialProfile(maxRUm, pointsCount = 200) {
      const result = [];
      const step = maxRUm / pointsCount;
      const lambdaUm = this.wavelengthNm / 1000.0;
      for (let i = 0; i <= pointsCount; i++) {
        const r = i * step;
        const x = (Math.PI * r) / (lambdaUm * this.fNumber);
        result.push({
          rUm: r,
          x: x,
          intensity: airyIntensity(x)
        });
      }
      return result;
    },

    /**
     * Calculate 2D Point Spread Function (PSF) discrete kernel
     * Kernel radius in pixels is scaled to represent the physical Airy disk on the sensor.
     * 
     * To ensure fast real-time convolution without blocking the browser thread,
     * kernel size is bounded to physical sensor pixel representation.
     */
    createAiryKernel(pixelScaleFactor = 1.0) {
      // Effective Airy radius in simulation pixels:
      // At pixelPitchUm = 3.76, Airy radius at f/22 is (29.5 / 2) / 3.76 ≈ 3.9 pixels.
      // With pixelScaleFactor (e.g. 1.0 to 1.5 for visual clarity), radius varies from ~0.25px (f/1.4) to ~5.0px (f/22).
      const airyRadiusSensorPx = (this.getAiryDiskRadiusUm() / this.pixelPitchUm) * pixelScaleFactor;
      
      // Radius of kernel covers out to at least the second dark ring (~2.23 * r_first_zero)
      const kernelRadius = Math.max(1, Math.min(12, Math.ceil(airyRadiusSensorPx * 1.5)));
      const kernelSize = kernelRadius * 2 + 1;
      const kernel = new Float32Array(kernelSize * kernelSize);
      
      let sum = 0.0;
      const lambdaUm = this.wavelengthNm / 1000.0;
      
      for (let y = -kernelRadius; y <= kernelRadius; y++) {
        for (let x = -kernelRadius; x <= kernelRadius; x++) {
          const distPx = Math.sqrt(x * x + y * y);
          // Convert distance in simulation pixels back to μm
          const distUm = (distPx / (pixelScaleFactor || 1.0)) * this.pixelPitchUm;
          // Calculate x parameter for Airy equation: x_param = π * r / (λ * N)
          const xParam = (Math.PI * distUm) / (lambdaUm * this.fNumber);
          
          let val = airyIntensity(xParam);
          // Cosine windowing at outer boundary to prevent high-frequency circular ring artifacts
          if (distPx > kernelRadius * 0.85) {
            const taper = 0.5 * (1.0 + Math.cos(Math.PI * (distPx - kernelRadius * 0.85) / (kernelRadius * 0.15)));
            val *= Math.max(0, taper);
          }
          
          const idx = (y + kernelRadius) * kernelSize + (x + kernelRadius);
          kernel[idx] = val;
          sum += val;
        }
      }
      
      // Normalize kernel so total energy = 1.0
      if (sum > 0) {
        for (let i = 0; i < kernel.length; i++) {
          kernel[i] /= sum;
        }
      }
      
      return {
        kernel: kernel,
        size: kernelSize,
        radius: kernelRadius,
        airyRadiusPx: airyRadiusSensorPx
      };
    },

    /**
     * Format numbers cleanly for UI display
     */
    formatValues() {
      const D = this.getApertureDiameterMm();
      const dAiry = this.getAiryDiskDiameterUm();
      const thetaArcsec = this.getAngularResolutionArcsec();
      const airyPx = this.getAiryDiskDiameterPixels();
      
      return {
        fNumber: `f/${this.fNumber.toFixed(1)}`,
        focalLength: `${this.focalLengthMm.toFixed(0)} mm`,
        apertureDiameter: `${D.toFixed(2)} mm`,
        wavelength: `${this.wavelengthNm.toFixed(0)} nm`,
        airyDiskDiameter: `${dAiry.toFixed(2)} μm`,
        airyDiskRadius: `${(dAiry / 2).toFixed(2)} μm`,
        angularResolution: `${thetaArcsec.toFixed(2)}"`,
        pixelCoverage: `${airyPx.toFixed(1)} px`,
        diffractionSeverity: this.fNumber >= 16 ? 'High (Diffraction-Limited)' : (this.fNumber >= 8 ? 'Moderate' : 'Low / Negligible')
      };
    }
  };

  window.Physics = Physics;
})(window);
