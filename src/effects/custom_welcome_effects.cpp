/*
 * ===================================================================
 * AERI LIGHT - CUSTOM WELCOME EFFECTS IMPLEMENTATION
 * ===================================================================
 * Deskripsi:
 * v19.2: Memperbaiki panggilan fungsi `fill_gradient_RGB` dengan
 * menambahkan namespace `fl::`.
 * ===================================================================
 */

#include "effects/custom_welcome_effects.h"

namespace CustomWelcomeEffects
{

    // 6. Charging
    void charging(WelcomeEffectParams &params)
    {
        uint16_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount);
        // PERBAIKAN: Menambahkan namespace fl::
        fl::fill_gradient_RGB(params.leds, pos, CRGB::Black, params.color1);
    }

    // 7. Glitch
    void glitch(WelcomeEffectParams &params)
    {
        fadeToBlackBy(params.leds, params.ledCount, 20);
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
        fadeToBlackBy(params.leds, params.ledCount, 40);
        params.leds[pos] = params.color1;
    }

    // 9. Burning
    void burning(WelcomeEffectParams &params)
    {
        uint16_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount);
        for (uint16_t i = 0; i < pos; i++)
        {
            params.leds[i] = HeatColor(map(i, 0, params.ledCount, 0, 255));
        }
    }

    // 10. Warp Speed
    void warpSpeed(WelcomeEffectParams &params)
    {
        fadeToBlackBy(params.leds, params.ledCount, 20);
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
            CRGB c2 = params.color2; // Sekarang sudah valid
            params.leds[i] = blend(c1.nscale8(val1), c2.nscale8(val2), 128);
        }
    }

    // 12. Laser
    void laser(WelcomeEffectParams &params)
    {
        uint16_t pos = map(params.elapsed, 0, params.duration, 0, params.ledCount);
        fill_solid(params.leds, params.ledCount, CRGB::Black);
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
        fill_solid(params.leds, params.ledCount, c);
    }

    // 14. Liquid
    void liquid(WelcomeEffectParams &params)
    {
        int t = params.elapsed / 5;
        for (uint16_t i = 0; i < params.ledCount; i++)
        {
            uint8_t val = cubicwave8((i * 20) + t);
            params.leds[i] = blend(CRGB::Black, params.color1, val);
        }
    }

    // 15. Spotlights
    void spotlights(WelcomeEffectParams &params)
    {
        fadeToBlackBy(params.leds, params.ledCount, 30);
        uint32_t t = params.elapsed / 20;
        for (int i = 0; i < 4; i++)
        {
            int pos = beatsin16(15 + i * 2, 0, params.ledCount - 1, 0, i * 16384);
            params.leds[pos] = CHSV(t, 255, 255);
        }
    }

} // namespace CustomWelcomeEffects