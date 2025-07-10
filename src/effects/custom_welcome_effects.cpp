/*
 * ===================================================================
 * AERI LIGHT - CUSTOM WELCOME EFFECTS IMPLEMENTATION (REVISED)
 * ===================================================================
 */

#include <FastLED.h>
#include "custom_welcome_effects.h"

namespace CustomWelcomeEffects
{

    // 6. Charging
    void charging(WelcomeEffectParams &params)
    {
        uint16_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount);
        fl::fill_gradient_RGB(params.leds, pos, CRGB::Black, params.color1);
    }

    // 7. Glitch
    void glitch(WelcomeEffectParams &params)
    {
        fl::fadeToBlackBy(params.leds, params.ledCount, 20);
        if (random8() < 50)
        {
            int start = random16(params.ledCount);
            int len = random8(1, (params.ledCount / 4) + 1);
            for (int i = start; i < start + len && i < params.ledCount; i++)
            {
                params.leds[i] = CRGB::White;
            }
        }
    }

    // 8. Sonar
    void sonar(WelcomeEffectParams &params)
    {
        uint8_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount - 1);
        fl::fadeToBlackBy(params.leds, params.ledCount, 40);
        params.leds[pos] = params.color1;
    }

    // 9. Burning
    void burning(WelcomeEffectParams &params)
    {
        uint16_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount);
        for (uint16_t i = 0; i < pos; i++)
        {
            params.leds[i] = fl::HeatColor(map(i, 0, params.ledCount, 0, 255));
        }
    }

    // 10. Warp Speed
    void warpSpeed(WelcomeEffectParams &params)
    {
        fl::fadeToBlackBy(params.leds, params.ledCount, 20);
        for (int i = 0; i < 5; i++)
        {
            params.leds[random16(params.ledCount)] = CRGB::White;
        }
    }

    // 11. DNA
    void dna(WelcomeEffectParams &params)
    {
        int t = params.elapsed;
        for (uint16_t i = 0; i < params.ledCount; i++)
        {
            uint8_t val1 = sin8(i * 10 + t);
            uint8_t val2 = cos8(i * 10 + t);
            CRGB c1 = params.color1;
            CRGB c2 = params.color2;
            params.leds[i] = fl::blend(c1.nscale8(val1), c2.nscale8(val2), 128);
        }
    }

    // 12. Laser
    void laser(WelcomeEffectParams &params)
    {
        uint16_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount);
        fl::fill_solid(params.leds, params.ledCount, CRGB::Black);
        if (pos < params.ledCount)
            params.leds[pos] = params.color1;
    }

    // 13. Heartbeat
    void heartbeat(WelcomeEffectParams &params)
    {
        uint8_t beat = beatsin8(120, 0, 255, 0, 0);
        uint8_t beat2 = beat > 200 ? 255 : 0;
        uint8_t finalBeat = (beat > beat2) ? beat : beat2;
        CRGB c = params.color1;
        c.nscale8(finalBeat);
        fl::fill_solid(params.leds, params.ledCount, c);
    }

    // 14. Liquid
    void liquid(WelcomeEffectParams &params)
    {
        int t = params.elapsed / 5;
        for (uint16_t i = 0; i < params.ledCount; i++)
        {
            uint8_t val = cubicwave8((i * 20) + t);
            params.leds[i] = fl::blend(CRGB::Black, params.color1, val);
        }
    }

    // 15. Spotlights
    void spotlights(WelcomeEffectParams &params)
    {
        fl::fadeToBlackBy(params.leds, params.ledCount, 30);
        uint32_t t = params.elapsed / 20;
        for (int i = 0; i < 4; i++)
        {
            int pos = beatsin16(15 + i * 2, 0, params.ledCount - 1, 0, i * 16384);
            params.leds[pos] = CHSV(t, 255, 255);
        }
    }

    // --- IMPLEMENTASI EFEK BARU ---

    // 17. Dynamic Gradient Sweep
    void dynamicGradientSweep(WelcomeEffectParams &params)
    {
        uint8_t hue = map(params.elapsed, 0, params.duration, 0, 255);
        fl::fill_rainbow(params.leds, params.ledCount, hue, 256 / params.ledCount);
    }

    // 18. Sequential Startup Scan (Knight-Rider 2.0 from middle)
    void sequentialStartupScan(WelcomeEffectParams &params)
    {
        fl::fadeToBlackBy(params.leds, params.ledCount, 35);
        int mid = params.ledCount / 2;
        int pos = map(params.elapsed, 0, params.duration, 0, mid + 8);

        for (int i = 0; i < 8; i++)
        {
            if (mid + pos - i < params.ledCount)
            {
                params.leds[mid + pos - i] = CRGB::OrangeRed;
            }
            if (mid - pos + i >= 0)
            {
                params.leds[mid - pos + i] = CRGB::OrangeRed;
            }
        }
    }

    // 19. Fluid Particle Swirl (Visual Interpretation)
    void fluidParticleSwirl(WelcomeEffectParams &params)
    {
        // Efek ini adalah interpretasi visual dari "partikel cair"
        // tanpa menggunakan sensor eksternal (IMU/akselerometer).
        fl::fadeToBlackBy(params.leds, params.ledCount, 20);
        for (int i = 0; i < 3; i++)
        {
            uint16_t pos1 = beatsin16(10 + i, 0, params.ledCount - 1, 0, i * 16384);
            uint16_t pos2 = beatsin16(15 + i, 0, params.ledCount - 1, 0, i * 16384 + 8192);
            params.leds[pos1] = fl::blend(params.leds[pos1], CHSV(160, 200, 255), 128);
            params.leds[pos2] = fl::blend(params.leds[pos2], CHSV(96, 255, 255), 128);
        }
    }

    // 20. Ambient Screen/Audio Sync Pulse (Visual Interpretation)
    void ambientSyncPulse(WelcomeEffectParams &params)
    {
        // Efek ini adalah interpretasi "pulse lembut" tanpa input eksternal.
        // Warna diambil dari warna primer dan sekunder yang dikonfigurasi.
        uint8_t pulse = beatsin8(20, 64, 255, 0, 0);
        CRGB c = fl::blend(params.color1, params.color2, 128);
        c.nscale8(pulse);
        fl::fill_solid(params.leds, params.ledCount, c);
    }

    // 21. Bioluminescent Breath
    void bioluminescentBreath(WelcomeEffectParams &params)
    {
        // Menggunakan gelombang sinus untuk efek pernapasan lambat.
        uint8_t breathValue = sin8(map(params.elapsed, 0, params.duration, 0, 127));
        CRGB finalColor = CRGB::LimeGreen;
        finalColor.nscale8(breathValue);
        fl::fill_solid(params.leds, params.ledCount, finalColor);
    }

    // 22. ROG Cyberwave Dual-Tone
    void rogCyberwave(WelcomeEffectParams &params)
    {
        uint8_t hue = map(params.elapsed, 0, params.duration, 0, 255 * 2);
        #ifndef HUE_MAGENTA
        #define HUE_MAGENTA 213
        #endif
        CRGB c1 = CHSV(HUE_MAGENTA, 255, 255);
        #ifndef HUE_CYAN
        #define HUE_CYAN 128
        #endif
        CRGB c2 = CHSV(HUE_CYAN, 255, 255);
        fl::fill_gradient_RGB(params.leds, params.ledCount, c1, c2, c1);

        // Garis putih tipis di tepi
        int pos = map(params.elapsed, 0, params.duration, 0, params.ledCount - 1);
        params.leds[pos] = CRGB::White;
    }

} // namespace CustomWelcomeEffects