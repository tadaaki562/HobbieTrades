package com.hobbietrades.backend.service;

import com.hobbietrades.backend.repository.PriceReferenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PriceEstimationService {

    @Autowired
    private PriceReferenceRepository priceReferenceRepository;

    private static final Map<String, Double> CONDITION_MULTIPLIERS = new HashMap<>();
    static {
        CONDITION_MULTIPLIERS.put("Like New", 0.80);
        CONDITION_MULTIPLIERS.put("Good", 0.65);
        CONDITION_MULTIPLIERS.put("Fair", 0.50);
        CONDITION_MULTIPLIERS.put("Worn", 0.30);
    }

    public Map<String, Object> estimatePrice(String category, String condition, String keyword) {
        Map<String, Object> result = new HashMap<>();

        // Step 1 — Try keyword match first (most specific)
        if (keyword != null && !keyword.isEmpty()) {
            String[] words = keyword.toLowerCase().split(" ");
            for (String word : words) {
                if (word.length() < 3) continue; // skip short words
                var matches = priceReferenceRepository
                        .findByKeywordContainingIgnoreCaseAndConditionLabel(word, condition);
                if (!matches.isEmpty()) {
                    double avg = matches.stream()
                            .mapToDouble(p -> p.getAvgPrice().doubleValue())
                            .average()
                            .orElse(0);
                    if (avg > 0) {
                        result.put("estimatedValue", Math.round(avg));
                        result.put("rangeLow", Math.round(avg * 0.85));
                        result.put("rangeHigh", Math.round(avg * 1.15));
                        result.put("condition", condition);
                        result.put("category", category);
                        result.put("matchedKeyword", word);
                        result.put("source", "Keyword-matched market data");
                        result.put("confidence", "High");
                        return result;
                    }
                }
            }
        }

        // Step 2 — Fall back to category average
        Double avgPrice = priceReferenceRepository
                .getAveragePriceByCategoryAndCondition(category, condition);

        if (avgPrice != null && avgPrice > 0) {
            result.put("estimatedValue", Math.round(avgPrice));
            result.put("rangeLow", Math.round(avgPrice * 0.85));
            result.put("rangeHigh", Math.round(avgPrice * 1.15));
            result.put("condition", condition);
            result.put("category", category);
            result.put("source", "Category average market data");
            result.put("confidence", "Medium");
            return result;
        }

        // Step 3 — Last resort: condition multiplier
        Map<String, Double> categoryBasePrices = new HashMap<>();
        categoryBasePrices.put("Cameras", 15000.0);
        categoryBasePrices.put("Instruments", 6000.0);
        categoryBasePrices.put("Sports", 3000.0);
        categoryBasePrices.put("Gaming", 14000.0);
        categoryBasePrices.put("Art", 2500.0);
        categoryBasePrices.put("Craft", 1200.0);
        categoryBasePrices.put("Other", 2000.0);

        double basePrice = categoryBasePrices.getOrDefault(category, 2000.0);
        double multiplier = CONDITION_MULTIPLIERS.getOrDefault(condition, 0.50);
        double estimated = Math.round(basePrice * multiplier);

        result.put("estimatedValue", estimated);
        result.put("rangeLow", Math.round(estimated * 0.85));
        result.put("rangeHigh", Math.round(estimated * 1.15));
        result.put("condition", condition);
        result.put("category", category);
        result.put("source", "Condition-based estimation (fallback)");
        result.put("confidence", "Low");
        return result;
    }
}