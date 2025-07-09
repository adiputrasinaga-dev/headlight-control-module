/*
 * ===================================================================
 * AERI LIGHT - EFFECTS IMPLEMENTATION (REVISED)
 * ===================================================================
 */

#include "effects.h"

// Mode 0: Solid
void solid(EffectParams &params)
{
    fl::fill_solid(params.leds, params.ledCount, params.color1);
}

// Mode 1: Breathing
void breathing(EffectParams &params)
{
    uint8_t scale = sin8(params.animStep * params.speed);
    CRGB scaledColor = params.color1;
    scaledColor.nscale8(scale);
    fl::fill_solid(params.leds, params.ledCount, scaledColor);
}

// Mode 2: Rainbow
void rainbow(EffectParams &params)
{
    fl::fill_rainbow(params.leds, params.ledCount, params.animStep * params.speed, 256 / params.ledCount);
}

// Mode 3: Comet
void comet(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 64);
    float p = fmod((float)params.animStep * params.speed * 0.5, (float)params.ledCount + 15);
    if ((int)p < params.ledCount)
    {
        params.leds[(int)p] = params.color1;
    }
}

// Mode 4: Cylon Scanner
void cylonScanner(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 64);
    int p = map(triwave8((params.animStep * params.speed) / 2), 0, 255, 0, params.ledCount - 4);
    if (p >= 0 && (p + 3) < params.ledCount)
    {
        for (int i = 0; i < 4; i++)
        {
            params.leds[p + i] = params.color1;
        }
    }
}

// Mode 5: Twinkle
void twinkle(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 40);
    if (random8() < 80)
    {
        params.leds[random16(params.ledCount)] = (random8() < 128) ? params.color1 : params.color2;
    }
}

// Mode 6: Fire
void fire(EffectParams &params)
{
    for (int i = 0; i < params.ledCount; i++)
    {
        params.leds[i].nscale8(192);
    }
    if (random8() < 80)
    {
        params.leds[random16(params.ledCount)] = fl::HeatColor(random8(160, 255));
    }
}

// Mode 7: Gradient Shift
void gradientShift(EffectParams &params)
{
    fl::fill_gradient_RGB(params.leds, params.ledCount, params.color1, params.color2, params.color3);
}

// Mode 8: Plasma Ball
void plasmaBall(EffectParams &params)
{
    int plasma1 = sin8(params.animStep * params.speed + random8());
    int plasma2 = sin8(params.animStep * params.speed + random8() + 128);
    int plasma3 = sin8(params.animStep * 2 * params.speed + random8());
    for (int i = 0; i < params.ledCount; i++)
    {
        int val = sin8(i * 10 + plasma1) + sin8(i * 12 + plasma2) + sin8(i * 14 + plasma3);
        params.leds[i] = fl::blend(CRGB::Black, params.color1, map(val, 0, 765, 0, 255));
        params.leds[i] += params.color2.nscale8(32);
    }
}

// Mode 9: Theater Chase
void theaterChase(EffectParams &params)
{
    uint8_t cycle = params.animStep * params.speed / 32;
    for (int i = 0; i < params.ledCount; i++)
    {
        if ((i + cycle) % 4 == 0)
        {
            params.leds[i] = params.color1;
        }
        else
        {
            params.leds[i] = CRGB::Black;
        }
    }
}

// Mode 10: Color Wipe
void colorWipe(EffectParams &params)
{
    uint16_t pos = map(params.animStep * params.speed, 0, 65535, 0, params.ledCount * 2);
    if (pos < params.ledCount)
    {
        fl::fill_solid(params.leds, pos, params.color1);
        fl::fill_solid(params.leds + pos, params.ledCount - pos, params.color2);
    }
    else
    {
        fl::fill_solid(params.leds, params.ledCount, params.color1);
    }
}

// Mode 11: Pride
void pride(EffectParams &params)
{
    static uint16_t sPseudotime = 0;
    sPseudotime += params.speed * 8;
    for (uint16_t i = 0; i < params.ledCount; i++)
    {
        uint8_t hue = (i * 256 / params.ledCount) + (sPseudotime / 256);
        params.leds[i] = CHSV(hue, 255, 255);
    }
}

// Mode 12: Pacifica (Ombak Laut)
void pacifica_loop(EffectParams &params);
void pacifica(EffectParams &params)
{
    pacifica_loop(params);
}

CRGBPalette16 pacifica_palette_1 = {0x000507, 0x000409, 0x00030B, 0x00030D, 0x000210, 0x000212, 0x000114, 0x000117, 0x000019, 0x00001C, 0x000026, 0x000031, 0x00003B, 0x000046, 0x14554B, 0x28AA50};
CRGBPalette16 pacifica_palette_2 = {0x000507, 0x000409, 0x00030B, 0x00030D, 0x000210, 0x000212, 0x000114, 0x000117, 0x000019, 0x00001C, 0x000026, 0x000031, 0x00003B, 0x000046, 0x0C5F52, 0x19B35A};
CRGBPalette16 pacifica_palette_3 = {0x000208, 0x00030E, 0x000514, 0x00061A, 0x000820, 0x000927, 0x000B2D, 0x000C33, 0x000E3A, 0x001041, 0x001248, 0x00144F, 0x001656, 0x00185D, 0x001A64, 0x001C6B};

void pacifica_loop(EffectParams &params)
{
    static uint16_t sCIStart1, sCIStart2, sCIStart3, sCIStart4;
    static uint32_t sLastms = 0;
    uint32_t ms = millis();
    uint32_t deltams = ms - sLastms;
    sLastms = ms;
    uint16_t speedfactor1 = beatsin16(3, 179, 269);
    uint16_t speedfactor2 = beatsin16(4, 179, 269);
    uint32_t deltams1 = (deltams * speedfactor1) / 256;
    uint32_t deltams2 = (deltams * speedfactor2) / 256;
    sCIStart1 += deltams1;
    sCIStart2 -= deltams2;
    uint16_t wave_angle = sCIStart1 - sCIStart2;
    CRGB c1 = fl::ColorFromPalette(pacifica_palette_1, sCIStart1 >> 8);
    CRGB c2 = fl::ColorFromPalette(pacifica_palette_2, sCIStart2 >> 8);
    for (uint16_t i = 0; i < params.ledCount; i++)
    {
        CRGB mix = fl::blend(c1, c2, cos8(wave_angle));
        wave_angle += 25;
        params.leds[i] = mix;
    }
}

// Mode 13: Bouncing Balls
void bouncingBalls(EffectParams &params)
{
    static float v[3] = {0, 0, 0};
    static float p[3] = {0, (float)params.ledCount / 2, (float)params.ledCount - 1};
    static CRGB colors[3];
    static unsigned long last_update = 0;
    colors[0] = params.color1;
    colors[1] = params.color2;
    colors[2] = params.color3;
    if (millis() - last_update < 15)
        return;
    last_update = millis();
    fl::fadeToBlackBy(params.leds, params.ledCount, 60);
    for (int i = 0; i < 3; i++)
    {
        p[i] += v[i];
        v[i] -= 0.08f * (float)params.speed / 10.0f;
        if (p[i] <= 0)
        {
            p[i] = 0;
            v[i] *= -0.85;
        }
        if (p[i] >= params.ledCount - 1)
        {
            p[i] = params.ledCount - 1;
            v[i] *= -0.85;
        }
        if ((int)p[i] < params.ledCount)
        {
            params.leds[(int)p[i]] = colors[i];
        }
    }
}

// --- 10 EFEK BARU ---

// Mode 14: Meteor
void meteor(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 128);
    int pos = params.animStep * params.speed % (params.ledCount * 2);
    if (pos < params.ledCount)
    {
        params.leds[pos] = params.color1;
    }
}

// Mode 15: Confetti
void confetti(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 10);
    int pos = random16(params.ledCount);
    params.leds[pos] += CHSV(params.animStep * params.speed + random8(64), 200, 255);
}

// Mode 16: Juggle
void juggle(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 20);
    for (int i = 0; i < 8; i++)
    {
        uint16_t pos = sin16(params.animStep * (i + 3) * params.speed + i * 10000) * (params.ledCount - 1) / 65535;
        params.leds[pos] |= CHSV(i * 32, 255, 255);
    }
}

// Mode 17: Sinelon (Dot Bergerak)
void sinelon(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 20);
    int pos = beatsin16(13 * params.speed, 0, params.ledCount - 1);
    params.leds[pos] += params.color1;
}

// Mode 18: Noise
void noise(EffectParams &params)
{
    for (uint16_t i = 0; i < params.ledCount; i++)
    {
        uint8_t noise = inoise8(i * 20, params.animStep * params.speed);
        uint8_t hue = map(noise, 0, 255, 0, 255);
        params.leds[i] = CHSV(hue, 255, 255);
    }
}

// Mode 19: Matrix
void matrix(EffectParams &params)
{
    if (random8() < params.speed)
    {
        params.leds[0] = CRGB::Green;
    }
    for (int i = params.ledCount - 1; i > 0; i--)
    {
        params.leds[i] = params.leds[i - 1];
    }
    fl::fadeToBlackBy(params.leds, params.ledCount, 20);
}

// Mode 20: Ripple
void ripple(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 10);
    static int center = 0;
    static uint8_t step = -1;

    if (params.animStep % (256 / params.speed) == 0)
    {
        center = random(params.ledCount);
    }

    if (step == -1)
    {
        step = 0;
    }

    if (step < params.ledCount)
    {
        uint8_t intensity = 255 - (step * (256 / params.ledCount));
        if (center + step < params.ledCount)
            params.leds[center + step] += params.color1.nscale8(intensity);
        if (center - step >= 0)
            params.leds[center - step] += params.color1.nscale8(intensity);
        step++;
    }
    else
    {
        step = -1;
    }
}

// Mode 21: Larson Scanner (KITT)
void larsonScanner(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 40);
    int pos = beatsin16(10 * params.speed, 0, params.ledCount);
    if (pos > 0)
        params.leds[pos - 1] = params.color1.nscale8(80);
    params.leds[pos] = params.color1;
    if (pos < params.ledCount - 1)
        params.leds[pos + 1] = params.color1.nscale8(80);
}

// Mode 22: Two-Color Wipe
void twoColorWipe(EffectParams &params)
{
    int pos = map(triwave8(params.animStep * params.speed / 16), 0, 255, 0, params.ledCount);
    for (int i = 0; i < params.ledCount; i++)
    {
        if (i <= pos)
        {
            params.leds[i] = params.color1;
        }
        else
        {
            params.leds[i] = params.color2;
        }
    }
}

// Mode 23: Lightning
void lightning(EffectParams &params)
{
    fl::fadeToBlackBy(params.leds, params.ledCount, 100);
    if (random8() < params.speed)
    {
        int start = random16(params.ledCount);
        int len = random16(params.ledCount - start);
        fl::fill_solid(params.leds + start, len, CRGB::White);
    }
}