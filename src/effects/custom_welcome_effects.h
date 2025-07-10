/*
 * ===================================================================
 * AERI LIGHT - CUSTOM WELCOME EFFECTS HEADER
 * ===================================================================
 * Deskripsi:
 * v19.2: Menggunakan namespace dan memastikan include yang benar.
 * ===================================================================
 */

#ifndef CUSTOM_WELCOME_EFFECTS_H
#define CUSTOM_WELCOME_EFFECTS_H

#include "welcome_effects.h" // Menggunakan struct yang sama dari welcome standar

// Gunakan namespace untuk menghindari konflik nama
namespace CustomWelcomeEffects
{

  void charging(WelcomeEffectParams &params);
  void glitch(WelcomeEffectParams &params);
  void sonar(WelcomeEffectParams &params);
  void burning(WelcomeEffectParams &params);
  void warpSpeed(WelcomeEffectParams &params);
  void dna(WelcomeEffectParams &params);
  void laser(WelcomeEffectParams &params);
  void heartbeat(WelcomeEffectParams &params);
  void liquid(WelcomeEffectParams &params);
  void spotlights(WelcomeEffectParams &params);

  // --- EFEK BARU DARI GAMBAR ---
  void dynamicGradientSweep(WelcomeEffectParams &params);
  void sequentialStartupScan(WelcomeEffectParams &params);
  void fluidParticleSwirl(WelcomeEffectParams &params);
  void ambientSyncPulse(WelcomeEffectParams &params);
  void bioluminescentBreath(WelcomeEffectParams &params);
  void rogCyberwave(WelcomeEffectParams &params);

}

#endif // CUSTOM_WELCOME_EFFECTS_H