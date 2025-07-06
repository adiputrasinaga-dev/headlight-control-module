/*
 * ===================================================================
 * AERI LIGHT - WELCOME EFFECTS IMPLEMENTATION
 * ===================================================================
 * Deskripsi:
 * v19.2: Membungkus semua fungsi dalam namespace.
 * ===================================================================
 */

#include "welcome_effects.h"

namespace WelcomeEffects
{

    // Mode 0: Power-On Scan
    void powerOnScan(WelcomeEffectParams &params)
    {
        int p = map(triwave8(map(params.elapsed, 0, params.duration, 0, 255)), 0, 255, 0, params.ledCount - 1);
        if (p >= 0 && p < params.ledCount)
            params.leds[p] = params.color1;
    }

    // Mode 1: Ignition Burst
    void ignitionBurst(WelcomeEffectParams &params)
    {
        uint8_t b = map(params.elapsed, 0, params.duration, 0, (params.ledCount / 2) + 1);
        int mid = params.ledCount / 2;
        for (int i = 0; i < b; i++)
        {
            if ((mid + i) < params.ledCount)
                params.leds[mid + i] = CRGB::Orange;
            if ((mid - i) >= 0)
                params.leds[mid - i] = CRGB::Orange;
        }
    }

    // Mode 2: Spectrum Resolve
    void spectrumResolve(WelcomeEffectParams &params)
    {
        uint32_t halfDuration = params.duration / 2;
        if (params.elapsed < halfDuration)
        {
            fill_rainbow(params.leds, params.ledCount, map(params.elapsed, 0, halfDuration, 0, 255), 256 / params.ledCount);
        }
        else
        {
            uint8_t blend_amount = map(params.elapsed, halfDuration, params.duration, 0, 255);
            for (int i = 0; i < params.ledCount; i++)
            {
                params.leds[i] = blend(params.leds[i], params.color1, blend_amount);
            }
        }
    }

    // Mode 3: Theater Chase
    void theaterChaseWelcome(WelcomeEffectParams &params)
    {
        uint16_t p = map(params.elapsed, 0, params.duration, 0, params.ledCount / 2);
        for (int i = 0; i < p; i++)
        {
            if (i < params.ledCount)
                params.leds[i] = CRGB::Blue;
            if ((params.ledCount - 1 - i) >= 0)
                params.leds[params.ledCount - 1 - i] = CRGB::Blue;
        }
    }

    // Mode 4: Dual Comet
    void dualCometWelcome(WelcomeEffectParams &params)
    {
        fadeToBlackBy(params.leds, params.ledCount, 64);
        int mid = params.ledCount / 2;
        int pos = map(params.elapsed, 0, params.duration, 0, mid);
        if (mid + pos < params.ledCount)
            params.leds[mid + pos] = params.color1;
        if (mid - pos >= 0)
            params.leds[mid - pos] = params.color1;
    }

    // Mode 5: Center Fill
    void centerFill(WelcomeEffectParams &params)
    {
        int mid = params.ledCount / 2;
        int len = map(params.elapsed, 0, params.duration, 0, mid);
        fill_solid(params.leds + mid - len, len * 2, params.color1);
    }

} // namespace WelcomeEffects
