precision highp float;

varying vec2 vUV;

uniform sampler2D textureSampler;

void main() {
    vec3 screenColor = texture2D(textureSampler, vUV).rgb;
    gl_FragColor = vec4(1.0 - screenColor, 1.0);
}