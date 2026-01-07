precision mediump float;

varying vec2 pos;
uniform float millis;
uniform vec2 uMouse;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;

// === TWEAKABLE SETTINGS ===
const float GRID_SIZE = 8.0;           // Number of diamond tiles
const float MOUSE_INFLUENCE = 0.02;    // How much mouse moves the image
const float BULGE_AMOUNT = 0.8;        // 0 = flat, 1 = full hemisphere
const float BLUR_SIZE = 0.5;           // Initial blur in pixels
const float FRESNEL_STRENGTH = 2.8;    // Edge brightness
const float SPECULAR_POWER = 30.0;     // Highlight sharpness (higher = tighter)
const float SPECULAR_STRENGTH = 0.1;   // Highlight intensity
const float BLOOM_THRESHOLD = 0.7;     // Brightness level for bloom
const float BLOOM_STRENGTH = 1.;      // Bloom intensity
const float GLARE_STRENGTH = 1.;      // Glare streak intensity
const float EDGE_THICKNESS = 0.02;     // Thickness of diamond boundaries (0.01-0.1)

// Pillow/inflated bulge distortion
vec2 pillowDistort(vec2 p, float bulgeAmount) {
    float r = length(p);
    float maxR = 1.414;
    float normalizedR = r / maxR;
    float sphereHeight = sqrt(max(0.0, 1.0 - normalizedR * normalizedR));
    float displacement = 1.0 + (1.0 - sphereHeight) * bulgeAmount;
    return p * displacement;
}

// Image fitting (cover mode)
vec2 coverUV(vec2 uv, vec2 screenRes, vec2 imageRes) {
    float screenAspect = screenRes.x / screenRes.y;
    float imageAspect = imageRes.x / imageRes.y;
    
    vec2 scale = vec2(1.0);
    if (screenAspect > imageAspect) {
        scale.y = imageAspect / screenAspect;
    } else {
        scale.x = screenAspect / imageAspect;
    }
    
    return (uv - 0.5) * scale + 0.5;
}

void main() {
    vec2 uv = pos;
    uv.y = 1.0 - uv.y; // Flip Y coordinate for WebGL
    
    float aspect = uResolution.x / uResolution.y;
    vec2 scaledUV = vec2(uv.x * aspect, uv.y);
    
    // Rotate 45 degrees for diamond grid
    float angle = 3.14159265 / 4.0;
    float cosA = cos(angle);
    float sinA = sin(angle);
    vec2 rotatedUV = vec2(
        scaledUV.x * cosA - scaledUV.y * sinA,
        scaledUV.x * sinA + scaledUV.y * cosA
    );
    
    // Create grid and get cell position
    vec2 gridUV = rotatedUV * GRID_SIZE;
    vec2 cellID = floor(gridUV);
    vec2 cellUV = fract(gridUV);
    vec2 centeredUV = cellUV * 2.0 - 1.0; // Convert to -1 to 1 range
    
    // Calculate distance to edges for boundary lines
    float edgeDist = min(min(cellUV.x, 1.0 - cellUV.x), min(cellUV.y, 1.0 - cellUV.y));
    float edgeFactor = 1.0 - smoothstep(0.0, EDGE_THICKNESS, edgeDist);
    
    // Apply bulge distortion
    vec2 distortedCellUV = pillowDistort(centeredUV, BULGE_AMOUNT);
    vec2 finalCellUV = (distortedCellUV + 1.0) / 2.0;
    
    // Reconstruct UV coordinates from distorted grid
    vec2 distortedGridUV = cellID + finalCellUV;
    vec2 unscaledUV = distortedGridUV / GRID_SIZE;
    vec2 unrotatedUV = vec2(
        unscaledUV.x * cosA + unscaledUV.y * sinA,
        -unscaledUV.x * sinA + unscaledUV.y * cosA
    );
    vec2 finalUV = vec2(unrotatedUV.x / aspect, unrotatedUV.y);
    
    // Offset image based on mouse position
    finalUV += uMouse * MOUSE_INFLUENCE;
    
    vec2 imageUV = coverUV(finalUV, uResolution, uImageResolution);
    
    // Sample texture with blur
    vec2 texelSize = 1.0 / uImageResolution;
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;
    
    for (float i = -3.0; i <= 3.0; i += 1.0) {
        for (float j = -3.0; j <= 3.0; j += 1.0) {
            vec2 offset = vec2(i, j) * texelSize * BLUR_SIZE;
            float weight = exp(-(i*i + j*j) / 8.0);
            color += texture2D(uTexture, imageUV + offset) * weight;
            totalWeight += weight;
        }
    }
    color /= totalWeight;
    
    // Surface normal for lighting
    vec2 normal2D = centeredUV;
    float normalZ = sqrt(max(0.0, 1.0 - dot(normal2D, normal2D) * 0.3));
    vec3 normal = normalize(vec3(normal2D * 0.6, normalZ));
    
    // Lighting setup
    vec3 lightDir = normalize(vec3(0.3, 0.3, 0.8));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVector = normalize(lightDir + viewDir);
    
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Blinn-Phong specular (more physically accurate than Phong)
    float specular = pow(max(dot(normal, halfVector), 0.0), SPECULAR_POWER);
    
    // Only show specular on the curved parts of the pillow
    float curvature = length(centeredUV);
    float specularMask = smoothstep(0.2, 0.8, curvature) * (1.0 - smoothstep(0.8, 1.0, curvature));
    specular *= specularMask;
    
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);
    
    // Base metallic color
    vec3 metalColor = vec3(0.92, 0.93, 0.95);
    vec3 metallic = mix(color.rgb, color.rgb * metalColor, 0.3);
    
    // Create matte metal appearance for edges
    vec3 matteMetalColor = color.rgb * vec3(0.85, 0.87, 0.9);
    metallic = mix(metallic, matteMetalColor, edgeFactor * 0.5);
    
    // Brightness mask to hide highlights in dark areas
    float imageLuminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float brightMask = smoothstep(0.3, 0.7, imageLuminance);
    
    // Apply lighting (reduced at edges for matte effect)
    float matteFactor = mix(1.0, 0.4, edgeFactor);
    metallic *= 0.85 + diffuse * 0.2 * matteFactor;
    metallic += fresnel * FRESNEL_STRENGTH * brightMask * (1.0 - edgeFactor * 0.7);
    
    // Add specular highlights (reduced at edges for matte effect)
    vec3 specularColor = vec3(0.98, 0.99, 1.0);
    metallic += specularColor * specular * SPECULAR_STRENGTH * brightMask * (1.0 - edgeFactor * 0.8);
    
    // Bloom effect
    float luminance = dot(metallic, vec3(0.299, 0.587, 0.114));
    float bloomAmount = max(0.0, luminance - BLOOM_THRESHOLD) / (1.0 - BLOOM_THRESHOLD);
    bloomAmount = pow(bloomAmount, 0.8);
    
    float bloomRadius = 0.015;
    vec3 bloom = vec3(0.0);
    
    for (float i = -2.0; i <= 2.0; i += 1.0) {
        for (float j = -2.0; j <= 2.0; j += 1.0) {
            vec2 offset = vec2(i, j) * bloomRadius;
            vec2 sampleUV = coverUV(vec2(pos.x + offset.x, 1.0 - pos.y + offset.y), uResolution, uImageResolution);
            vec3 sampleColor = texture2D(uTexture, sampleUV).rgb;
            float sampleLum = dot(sampleColor, vec3(0.299, 0.587, 0.114));
            bloom += sampleColor * max(0.0, sampleLum - BLOOM_THRESHOLD);
        }
    }
    bloom /= 25.0;
    metallic += bloom * BLOOM_STRENGTH * (1.0 - edgeFactor * 0.8);
    
    // Glare streaks
    float glareIntensity = pow(max(0.0, luminance - 0.6), 2.0); // Lower threshold from 0.85 to 0.6
    float glareH = exp(-abs(centeredUV.y) * 8.0) * glareIntensity;
    float glareV = exp(-abs(centeredUV.x) * 8.0) * glareIntensity;
    float glareD1 = exp(-abs(centeredUV.x + centeredUV.y) * 6.0) * glareIntensity * 0.5;
    float glareD2 = exp(-abs(centeredUV.x - centeredUV.y) * 6.0) * glareIntensity * 0.5;
    
    metallic += vec3(1.0, 0.98, 0.95) * (glareH + glareV + glareD1 + glareD2) * GLARE_STRENGTH * (1.0 - edgeFactor * 0.5); // Reduced edge suppression
    metallic += vec3(1.0, 0.99, 0.97) * bloomAmount * 0.4 * (1.0 - edgeFactor * 0.8);
    
    // // Apply light grey filter
    // vec3 greyFilter = vec3(0.8, 0.8, 0.8);
    // metallic = mix(metallic, greyFilter, 0.3);
    
    // Tone mapping to prevent blowout while preserving highlights
    float maxLuminance = 2.0; // Maximum allowed brightness
    float currentLuminance = dot(metallic, vec3(0.299, 0.587, 0.114));
    float toneMappedLuminance = currentLuminance / (1.0 + currentLuminance / maxLuminance);
    metallic *= toneMappedLuminance / max(currentLuminance, 0.001); // Preserve color ratios
    
    gl_FragColor = vec4(metallic, 1.0);
}