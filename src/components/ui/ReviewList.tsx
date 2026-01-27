import { useState } from "react";
import { Review } from "@/types";
import { ReviewCard } from "./ReviewCard";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { StarRating } from "./StarRating";

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  loading?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  onHelpful?: (reviewId: string) => void;
  averageRating?: number;
  totalCount?: number;
}

export function ReviewList({
  reviews,
  currentUserId,
  loading,
  onEdit,
  onDelete,
  onHelpful,
  averageRating,
  totalCount,
}: ReviewListProps) {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "helpful" | "rating_high" | "rating_low">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  // Filtrar por rating
  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  // Ordenar
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "helpful":
        return b.helpfulCount - a.helpfulCount;
      case "rating_high":
        return b.rating - a.rating;
      case "rating_low":
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  // Paginação
  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const paginatedReviews = sortedReviews.slice(startIndex, startIndex + reviewsPerPage);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
        <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhuma avaliação ainda</h3>
        <p className="text-gray-600">Seja o primeiro a avaliar este produto!</p>
      </div>
    );
  }

  // Rating distribution (visual)
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Resumo + Distribuição de Ratings */}
      {averageRating !== undefined && totalCount !== undefined && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Média geral */}
            <div className="text-center md:text-left">
              <div className="text-4xl font-bold text-gray-900 mb-2">{averageRating.toFixed(1)}</div>
              <StarRating rating={averageRating} size="md" readonly />
              <p className="text-sm text-gray-600 mt-2">
                {totalCount} {totalCount === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>

            {/* Distribuição por estrelas */}
            <div className="flex-1 space-y-2">
              {ratingCounts.map(({ rating, count, percentage }) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                  className={`
                    w-full flex items-center gap-2 text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors
                    ${filterRating === rating ? "bg-blue-50 border border-blue-200" : ""}
                  `}
                >
                  <span className="font-medium w-6">{rating}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-gray-600 w-12 text-right">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros e Ordenação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {filterRating && (
            <button
              onClick={() => setFilterRating(null)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Limpar filtro
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ordenar:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Mais recentes</option>
            <option value="helpful">Mais úteis</option>
            <option value="rating_high">Maior avaliação</option>
            <option value="rating_low">Menor avaliação</option>
          </select>
        </div>
      </div>

      {/* Lista de Reviews */}
      <div className="space-y-4">
        {paginatedReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onDelete={onDelete}
            onHelpful={onHelpful}
          />
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
