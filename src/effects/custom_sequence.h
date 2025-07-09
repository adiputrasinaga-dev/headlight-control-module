#ifndef CUSTOM_SEQUENCE_H
#define CUSTOM_SEQUENCE_H

#include <FastLED.h>

#define MAX_CUSTOM_WELCOME_STEPS 50 // Jumlah maksimum langkah dalam satu sekuens

// Definisikan struct untuk satu langkah dalam sekuens kustom
struct CustomEffectStep
{
    uint8_t targetSystem; // 0=Alis, 1=Shroud, 2=Demon
    uint8_t side;         // 0=Keduanya, 1=Kiri, 2=Kanan
    uint8_t effectMode;   // Mode efek dari effectRegistry (Solid, Rainbow, dll.)
    CRGB colors[3];       // Tiga slot warna untuk efek tersebut
    uint16_t duration;    // Durasi langkah ini dalam milidetik (ms)
};

#endif // CUSTOM_SEQUENCE_H