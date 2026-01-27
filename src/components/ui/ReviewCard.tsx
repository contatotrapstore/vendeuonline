import { Star, ThumbsUp, Edit2, Trash2, CheckCircle } from "lucide-react";
import { Review } from "@/types";
import { StarRating } from "./StarRating";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReviewCardProps {
  review: Review;
  currentUserId?: string; // ID do usuário logado (para mostrar botões edit/delete)
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  onHelpful?: (reviewId: string) => void;
}

export function ReviewCard({ review, currentUserId, onEdit, onDelete, onHelpful }: ReviewCardProps) {
  const isOwner = currentUserId === review.userId;
  const formattedDate = format(new Date(review.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      {/* Header: Avatar + Nome + Data */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {review.userAvatar ? (
              <img
                src={review.userAvatar}
                alt={review.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {review.userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nome + Badge */}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{review.userName}</p>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  Verificado
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{formattedDate}</p>
          </div>
        </div>

        {/* Botões Edit/Delete (se for dono) */}
        {isOwner && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(review)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Editar avaliação"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(review.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Deletar avaliação"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="mb-3">
        <StarRating rating={review.rating} size="sm" readonly />
      </div>

      {/* Título (opcional) */}
      {review.title && <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>}

      {/* Comentário */}
      <p className="text-gray-700 whitespace-pre-wrap mb-3">{review.comment}</p>

      {/* Imagens (se houver) */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-3">
          {review.images.map((image, idx) => (
            <img
              key={idx}
              src={image}
              alt={`Foto da avaliação ${idx + 1}`}
              className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(image, "_blank")}
            />
          ))}
        </div>
      )}

      {/* Footer: Botão "Útil" */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        {onHelpful && (
          <button
            onClick={() => onHelpful(review.id)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Útil</span>
            {review.helpfulCount > 0 && <span className="font-semibold">({review.helpfulCount})</span>}
          </button>
        )}
      </div>
    </div>
  );
}
