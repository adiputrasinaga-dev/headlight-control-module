/*
 * ===================================================================
 * AERI LIGHT - EFFECTS HEADER
 * ===================================================================
 * Deskripsi:
 * File header ini mendeklarasikan semua fungsi efek lampu yang tersedia.
 *
 * v18.9: Menambahkan deklarasi untuk 10 efek baru.
 * ===================================================================
 */

#ifndef EFFECTS_H
#define EFFECTS_H

#include <FastLED.h>

// Definisikan struct untuk melewatkan parameter dengan rapi
struct EffectParams
{
  CRGB *leds;
  uint16_t ledCount;
  uint16_t animStep;
  uint8_t speed;
  CRGB &color1;
  CRGB &color2;
  CRGB &color3;
  uint8_t brightness;
};

// Deklarasi (prototipe) untuk setiap fungsi efek
void noEffect(EffectParams &params); // Efek kosong baru
void solid(EffectParams &params);
void breathing(EffectParams &params);
void rainbow(EffectParams &params);
void comet(EffectParams &params);
void cylonScanner(EffectParams &params);
void twinkle(EffectParams &params);
void fire(EffectParams &params);
void gradientShift(EffectParams &params);
void plasmaBall(EffectParams &params);
void theaterChase(EffectParams &params);
void colorWipe(EffectParams &params);
void pride(EffectParams &params);
void pacifica(EffectParams &params);
void bouncingBalls(EffectParams &params);

// --- 10 EFEK BARU ---
void meteor(EffectParams &params);
void confetti(EffectParams &params);
void juggle(EffectParams &params);
void sinelon(EffectParams &params);
void noise(EffectParams &params);
void matrix(EffectParams &params);
void ripple(EffectParams &params);
void larsonScanner(EffectParams &params);
void twoColorWipe(EffectParams &params);
void lightning(EffectParams &params);

#endif // EFFECTS_H