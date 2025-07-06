/*
 * ===================================================================
 * AERI LIGHT - WELCOME EFFECTS HEADER
 * ===================================================================
 * Deskripsi:
 * v19.2: Menambahkan namespace dan melengkapi struct parameter.
 * ===================================================================
 */

#ifndef WELCOME_EFFECTS_H
#define WELCOME_EFFECTS_H

#include <FastLED.h>

// Definisikan struct parameter khusus untuk welcome effects
struct WelcomeEffectParams
{
    CRGB *leds;
    uint16_t ledCount;
    uint32_t elapsed;
    uint32_t duration;
    CRGB &color1;
    CRGB &color2; // Ditambahkan untuk konsistensi
    CRGB &color3; // Ditambahkan untuk konsistensi
};

namespace WelcomeEffects
{
    // Deklarasi (prototipe) untuk setiap fungsi efek welcome standar
    void powerOnScan(WelcomeEffectParams &params);
    void ignitionBurst(WelcomeEffectParams &params);
    void spectrumResolve(WelcomeEffectParams &params);
    void theaterChaseWelcome(WelcomeEffectParams &params);
    void dualCometWelcome(WelcomeEffectParams &params);
    void centerFill(WelcomeEffectParams &params);
}

#endif // WELCOME_EFFECTS_H
