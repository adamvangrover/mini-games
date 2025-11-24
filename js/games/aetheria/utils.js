// --- PERLIN NOISE IMPLEMENTATION ---
const perm = [];
let grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
             [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
             [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

for(let i=0; i<256; i++) perm[i] = Math.floor(Math.random()*256);
for(let i=0; i<256; i++) perm[i+256] = perm[i];

function dot(g, x, y) { return g[0]*x + g[1]*y; }
function mix(a, b, t) { return (1-t)*a + t*b; }
function fade(t) { return t*t*t*(t*(t*6-15)+10); }

export function noise2D(x, y) {
    let X = Math.floor(x) & 255;
    let Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    let u = fade(x);
    let v = fade(y);
    let A = perm[X]+Y, AA = perm[A], AB = perm[A+1],
        B = perm[X+1]+Y, BA = perm[B], BB = perm[B+1];
    return mix(mix(dot(grad3[AA % 12], x, y), dot(grad3[BA % 12], x-1, y), u),
               mix(dot(grad3[AB % 12], x, y-1), dot(grad3[BB % 12], x-1, y-1), u), v);
}
