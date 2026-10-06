#ifndef MMV_EASING_HPP
#define MMV_EASING_HPP

#include <cmath>
#include <algorithm>

namespace mmv {

enum class EasingType {
    Linear = 0,
    EaseInQuad = 1,
    EaseOutQuad = 2,
    EaseInOutQuad = 3,
    EaseInCubic = 4,
    EaseOutCubic = 5,
    EaseInOutCubic = 6,
    EaseInExpo = 7,
    EaseOutExpo = 8,
    EaseInOutExpo = 9,
    EaseOutBounce = 10,
    EaseInOutBounce = 11
};

inline float EaseOutBounce(float t) {
    const float n1 = 7.5625f;
    const float d1 = 2.75f;
    if (t < 1.0f / d1) {
        return n1 * t * t;
    } else if (t < 2.0f / d1) {
        t -= 1.5f / d1;
        return n1 * t * t + 0.75f;
    } else if (t < 2.5f / d1) {
        t -= 2.25f / d1;
        return n1 * t * t + 0.9375f;
    } else {
        t -= 2.625f / d1;
        return n1 * t * t + 0.984375f;
    }
}

inline float EaseInBounce(float t) {
    return 1.0f - EaseOutBounce(1.0f - t);
}

inline float EvaluateEasing(EasingType type, float t) {
    t = std::clamp(t, 0.0f, 1.0f);

    switch (type) {
        case EasingType::Linear:
            return t;

        case EasingType::EaseInQuad:
            return t * t;

        case EasingType::EaseOutQuad:
            return t * (2.0f - t);

        case EasingType::EaseInOutQuad:
            return t < 0.5f ? 2.0f * t * t : -1.0f + (4.0f - 2.0f * t) * t;

        case EasingType::EaseInCubic:
            return t * t * t;

        case EasingType::EaseOutCubic: {
            float f = t - 1.0f;
            return f * f * f + 1.0f;
        }

        case EasingType::EaseInOutCubic:
            return t < 0.5f 
                ? 4.0f * t * t * t 
                : (t - 1.0f) * (2.0f * t - 2.0f) * (2.0f * t - 2.0f) + 1.0f;

        case EasingType::EaseInExpo:
            return (t == 0.0f) ? 0.0f : std::pow(2.0f, 10.0f * (t - 1.0f));

        case EasingType::EaseOutExpo:
            return (t == 1.0f) ? 1.0f : 1.0f - std::pow(2.0f, -10.0f * t);

        case EasingType::EaseInOutExpo:
            if (t == 0.0f) return 0.0f;
            if (t == 1.0f) return 1.0f;
            if (t < 0.5f) return 0.5f * std::pow(2.0f, 20.0f * t - 10.0f);
            return 1.0f - 0.5f * std::pow(2.0f, -20.0f * t + 10.0f);

        case EasingType::EaseOutBounce:
            return EaseOutBounce(t);

        case EasingType::EaseInOutBounce:
            return t < 0.5f
                ? 0.5f * EaseInBounce(t * 2.0f)
                : 0.5f * EaseOutBounce(t * 2.0f - 1.0f) + 0.5f;

        default:
            return t;
    }
}

} // namespace mmv

#endif // MMV_EASING_HPP
