import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number; // 0-5
  onChange?: (rating: number) => void; // Se fornecido, modo interativo
  size?: "sm" | "md" | "lg";
  showCount?: boolean; // Mostrar "(4.5)" ao lado
  count?: number; // Número de avaliações
  className?: string;
  readonly?: boolean; // Forçar modo read-only
}

export function StarRating({
  rating,
  onChange,
  size = "md",
  showCount = false,
  count,
  className = "",
  readonly = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const isInteractive = onChange && !readonly;

  // Tamanhos das estrelas
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const starSize = sizeClasses[size];

  // Rating a ser exibido (hover tem prioridade se interativo)
  const displayRating = isInteractive && hoverRating > 0 ? hoverRating : rating;

  const handleClick = (starIndex: number) => {
    if (isInteractive) {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (isInteractive) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverRating(0);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={handleMouseLeave}
        role="group"
        aria-label={`Avaliação: ${rating} de 5 estrelas`}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = starIndex <= displayRating;
          const isHalfFilled = !Number.isInteger(displayRating) && starIndex === Math.ceil(displayRating);

          return (
            <button
              key={starIndex}
              type="button"
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => handleMouseEnter(starIndex)}
              disabled={!isInteractive}
              className={`
                ${isInteractive ? "cursor-pointer hover:scale-110" : "cursor-default"}
                transition-transform
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded
                disabled:cursor-default
              `}
              aria-label={`${starIndex} ${starIndex === 1 ? "estrela" : "estrelas"}`}
              tabIndex={isInteractive ? 0 : -1}
            >
              <Star
                className={`
                  ${starSize}
                  ${isFilled ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"}
                  ${isHalfFilled ? "fill-yellow-200" : ""}
                  transition-colors
                `}
              />
            </button>
          );
        })}
      </div>

      {/* Texto de rating/contagem */}
      {showCount && (
        <span className="text-sm text-gray-600 ml-1">
          ({rating.toFixed(1)})
          {count !== undefined && ` • ${count} ${count === 1 ? "avaliação" : "avaliações"}`}
        </span>
      )}
    </div>
  );
}
