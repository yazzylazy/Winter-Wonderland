uniform vec3 SurfColor; // = (0.7, 0.6, 0.18)
// turn into uniforms and change
uniform  float BumpDensity;
uniform  float BumpSize ;
uniform  float SpecularFactor ;

varying vec3 LightDir; 
varying vec3 EyeDir;
varying vec4 texCoord;

void main() {
  vec2 c = BumpDensity * texCoord.st;
  vec2 p = fract(c) - vec2(0.5);
  float d = p.x * p.x + p.y * p.y;
  float f = 1.0 / sqrt(d + 1.0);
  if (d >= BumpSize)
    { p = vec2(0.0); f = 1.0; }
  vec3 normDelta = vec3(p.x, p.y, 1.0) * f;
  vec3 litColor = SurfColor * max(dot(normDelta, LightDir), 0.0);
  vec3 reflectDir = reflect(LightDir, normDelta);
  float spec = SpecularFactor * max(dot(EyeDir, reflectDir), 0.0);
  litColor = min(litColor + spec, vec3(1.0));
  gl_FragColor = vec4(litColor, 1.0);
}
