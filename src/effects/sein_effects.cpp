#include "sein_effects.h"

namespace SeinEffects
{

    void sequential(SeinEffectParams &params)
    {
        CRGB finalColor = params.color;
        finalColor.nscale8_video(params.brightness);

        uint16_t animSpeed = map(params.speed, 0, 100, 25, 5);
        uint16_t pos = (millis() / animSpeed) % (params.ledCount + 5);
        fill_solid(params.leds, params.ledCount, CRGB::Black);
        if (pos < params.ledCount)
        {
            fill_solid(params.leds, pos + 1, finalColor);
        }
    }

    void pulsingArrow(SeinEffectParams &params)
    {
        CRGB finalColor = params.color;
        finalColor.nscale8_video(params.brightness);

        fill_solid(params.leds, params.ledCount, (millis() / 500) % 2 ? finalColor : CRGB::Black);
    }

    void fillAndFlush(SeinEffectParams &params)
    {
        CRGB finalColor = params.color;
        finalColor.nscale8_video(params.brightness);

        uint16_t animSpeed = map(params.speed, 0, 100, 25, 5);
        uint16_t cycle = (millis() / (animSpeed * params.ledCount));
        if (cycle % 2 == 0)
        {
            uint16_t p = (millis() / animSpeed) % params.ledCount;
            fill_solid(params.leds, p + 1, finalColor);
        }
        else
        {
            fill_solid(params.leds, params.ledCount, CRGB::Black);
        }
    }

    void cometTrail(SeinEffectParams &params)
    {
        CRGB finalColor = params.color;
        finalColor.nscale8_video(params.brightness);

        uint16_t animSpeed = map(params.speed, 0, 100, 25, 5);
        float p = fmod((float)millis() / (animSpeed * 0.5), (float)params.ledCount + 10);
        fadeToBlackBy(params.leds, params.ledCount, 40);
        if (p < params.ledCount)
        {
            params.leds[(int)p] = finalColor;
        }
    }

}