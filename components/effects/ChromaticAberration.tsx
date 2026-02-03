
import React from 'react';

interface ChromaticAberrationProps {
  intensity: number;
}

const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({ intensity }) => {
  if (intensity <= 0) return null;

  // FIX: Используем feBlend mode="screen" вместо feMerge.
  // feMerge просто кладет слои друг на друга (побеждает верхний).
  // feBlend mode="screen" математически складывает каналы (R+G+B = White), создавая корректный эффект сдвига.

  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
      <defs>
        <filter id="chromatic-aberration-filter">
          
          {/* 1. Создаем копию со сдвигом влево для КРАСНОГО канала */}
          <feOffset in="SourceGraphic" dx={-intensity} dy="0" result="offRed"/>
          
          {/* 2. Создаем копию со сдвигом вправо для СИНЕГО канала */}
          <feOffset in="SourceGraphic" dx={intensity} dy="0" result="offBlue"/>

          {/* 3. Изолируем Красный канал из сдвинутой копии */}
          <feColorMatrix in="offRed" type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0" result="redChannel"/>

          {/* 4. Изолируем Зеленый канал из ОРИГИНАЛА (без сдвига) */}
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0" result="greenChannel"/>

          {/* 5. Изолируем Синий канал из сдвинутой копии */}
          <feColorMatrix in="offBlue" type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0" result="blueChannel"/>

          {/* 6. Смешиваем каналы обратно: Red + Green + Blue = RGB Image */}
          <feBlend in="redChannel" in2="greenChannel" mode="screen" result="rg"/>
          <feBlend in="rg" in2="blueChannel" mode="screen" result="rgb"/>
          
        </filter>
      </defs>
    </svg>
  );
};

export default ChromaticAberration;
