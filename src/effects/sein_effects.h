#ifndef SEIN_EFFECTS_H
#define SEIN_EFFECTS_H

#include <FastLED.h>

struct SeinEffectParams
{
    CRGB *leds;
    uint16_t ledCount;
    uint8_t speed;
    const CRGB &color;
};

namespace SeinEffects
{
    void sequential(SeinEffectParams &params);
    void pulsingArrow(SeinEffectParams &params);
    void fillAndFlush(SeinEffectParams &params);
    void cometTrail(SeinEffectParams &params);
}

#endif // SEIN_EFFECTS_H