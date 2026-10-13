# Xiangshan Six Giant Rocks diorama — procedural build for Blender 5.x, headless.
#   Blender -b -P build.py -- preview|final|export
# Blender coords: X right, +Y away from the viewer (the city), Z up. The ridge is at -Y.
import bpy, bmesh, math, random, sys, os, time
from mathutils import Vector, Matrix, noise as mnoise

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = ARGS[0] if ARGS else 'preview'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
random.seed(20261013)
T0 = time.time()
def log(*a): print('[build %6.1fs]' % (time.time() - T0), *a, flush=True)

# ───────────────────────── helpers ─────────────────────────
def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t
def lerp3(a, b, t): return (lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))
def smooth(a, b, x):
    t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)
def fbm(x, y, z, octs=4):
    s = 0.0; a = 0.5; f = 1.0
    for i in range(octs):
        s += a * mnoise.noise(Vector((x * f + i * 17.3, y * f + i * 5.1, z * f + i * 9.7))); f *= 2.07; a *= 0.5
    return s
def vn01(x, y, z): return 0.5 + 0.5 * mnoise.noise(Vector((x, y, z)))
def rr(a, b): return random.uniform(a, b)
def pick(seq): return seq[random.randrange(len(seq))]
def s2l(c): return (c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hexc(h):
    h = h.lstrip('#'); return tuple(s2l(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))
def hexs(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COLL = bpy.data.collections.new('Diorama'); scene.collection.children.link(COLL)

def make_obj(name, verts, faces, mats=None, uvs=None, colors=None, smooth_shade=False, midx=None, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if mats:
        for m in mats: me.materials.append(m)
    if midx is not None: me.polygons.foreach_set('material_index', midx)
    if uvs is not None:
        uv = me.uv_layers.new(name='UVMap')
        flat = []
        for p in me.polygons:
            fuv = uvs[p.index]
            for k in range(len(p.loop_indices)): flat.extend(fuv[k])
        uv.data.foreach_set('uv', flat)
    if colors is not None:
        ca = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
        flat = []
        for c in colors: flat.extend((c[0], c[1], c[2], 1.0))
        ca.data.foreach_set('color', flat)
    if smooth_shade: me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me); ob.location = loc; ob.rotation_euler = rot; ob.scale = scale
    COLL.objects.link(ob); return ob

def inst(name, mesh, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
    ob = bpy.data.objects.new(name, mesh); ob.location = loc; ob.rotation_euler = rot; ob.scale = scale
    COLL.objects.link(ob); return ob

BOX_F = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]  # bottom, top, -Y, +X, +Y, -X
BOX_C = [(-.5, -.5, -.5), (.5, -.5, -.5), (.5, .5, -.5), (-.5, .5, -.5), (-.5, -.5, .5), (.5, -.5, .5), (.5, .5, .5), (-.5, .5, .5)]
def add_box(verts, faces, center, size, mat=None, uvs=None, uv_div=None, midx=None, mids=None):
    """Append a box. uv_div=(bay, floor) tiles the side faces; top/bottom get a plain 0..1 map."""
    b = len(verts); sx, sy, sz = size
    M = mat if mat is not None else Matrix.Identity(4)
    for c in BOX_C:
        v = M @ Vector((c[0] * sx, c[1] * sy, c[2] * sz)); verts.append((v.x + center[0], v.y + center[1], v.z + center[2]))
    for f in BOX_F: faces.append(tuple(b + i for i in f))
    if uvs is not None:
        if uv_div:
            bu = sx / uv_div[0]; du = sy / uv_div[0]; fv = sz / uv_div[1]
            uvs.append([(0, 0), (0, 1), (1, 1), (1, 0)]); uvs.append([(0, 0), (1, 0), (1, 1), (0, 1)])
            uvs.append([(0, 0), (bu, 0), (bu, fv), (0, fv)]); uvs.append([(0, 0), (du, 0), (du, fv), (0, fv)])
            uvs.append([(0, 0), (bu, 0), (bu, fv), (0, fv)]); uvs.append([(0, 0), (du, 0), (du, fv), (0, fv)])
        else:
            for _ in range(6): uvs.append([(0, 0), (1, 0), (1, 1), (0, 1)])
    if midx is not None:
        if mids is None: mids = [0] * 6
        midx.extend(mids)

def add_quad(verts, faces, pts, uvs=None, quv=None, midx=None, mi=0):
    b = len(verts); verts.extend(pts); faces.append((b, b + 1, b + 2, b + 3))
    if uvs is not None: uvs.append(quv if quv else [(0, 0), (1, 0), (1, 1), (0, 1)])
    if midx is not None: midx.append(mi)

def add_cyl(verts, faces, center, r0, r1, h, seg=10, midx=None, mi=0, uvs=None):
    b = len(verts)
    for (r, z) in ((r0, 0.0), (r1, h)):
        for i in range(seg):
            a = i / seg * 2 * math.pi
            verts.append((center[0] + r * math.cos(a), center[1] + r * math.sin(a), center[2] + z))
    for i in range(seg):
        j = (i + 1) % seg; faces.append((b + i, b + j, b + seg + j, b + seg + i))
        if uvs is not None: uvs.append([(0, 0), (1, 0), (1, 1), (0, 1)])
        if midx is not None: midx.append(mi)
    faces.append(tuple(b + seg + i for i in range(seg)))
    if uvs is not None: uvs.append([(0.5 + 0.5 * math.cos(i / seg * 2 * math.pi), 0.5 + 0.5 * math.sin(i / seg * 2 * math.pi)) for i in range(seg)])
    if midx is not None: midx.append(mi)

# ───────────────────────── materials ─────────────────────────
def new_mat(name, color=None, rough=0.8, metal=0.0, spec=0.4):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if color is not None: b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    return m
def bsdf_of(m): return m.node_tree.nodes.get('Principled BSDF')
def sock(node, name, stype, out=False):
    coll = node.outputs if out else node.inputs
    for s in coll:
        if s.name == name and s.type == stype: return s
    return coll[name]
def mix_node(nt, blend, fac=1.0):
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend; n.inputs[0].default_value = fac; return n
def noise_node(nt, scale, detail=4.0, rough=0.5):
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough; return n
def ramp_node(nt, stops):
    n = nt.nodes.new('ShaderNodeValToRGB'); cr = n.color_ramp
    while len(cr.elements) > 1: cr.elements.remove(cr.elements[-1])
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = (*stops[0][1], 1)
    for p, c in stops[1:]:
        e = cr.elements.new(p); e.color = (*c, 1)
    return n
def bump_chain(nt, bsdf, layers):
    """layers: list of (scale, detail, strength, distance)."""
    prev = None
    for sc, det, st, dist in layers:
        n = noise_node(nt, sc, det, 0.6); b = nt.nodes.new('ShaderNodeBump')
        b.inputs['Strength'].default_value = st; b.inputs['Distance'].default_value = dist
        nt.links.new(n.outputs['Fac'], b.inputs['Height'])
        if prev is not None: nt.links.new(prev.outputs['Normal'], b.inputs['Normal'])
        prev = b
    nt.links.new(prev.outputs['Normal'], bsdf.inputs['Normal'])

def vcol_mat(name, rough=0.9, bump=None, var=0.0):
    m = new_mat(name, rough=rough); nt = m.node_tree; b = bsdf_of(m)
    vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
    if var > 0:
        n = noise_node(nt, 3.0, 5, 0.55); r = ramp_node(nt, [(0, (1 - var,) * 3), (1, (1 + var,) * 3)])
        mx = mix_node(nt, 'MULTIPLY')
        nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(vc.outputs['Color'], sock(mx, 'A', 'RGBA'))
        nt.links.new(r.outputs['Color'], sock(mx, 'B', 'RGBA')); nt.links.new(sock(mx, 'Result', 'RGBA', True), b.inputs['Base Color'])
    else:
        nt.links.new(vc.outputs['Color'], b.inputs['Base Color'])
    if bump: bump_chain(nt, b, bump)
    return m

# in-memory painted images (facade cells, road markings)
def new_image(name, w, h, painter):
    px = [0.0, 0.0, 0.0, 1.0] * (w * h)
    def rect(x0, y0, x1, y1, col):
        r, g, b = col
        for y in range(max(0, int(y0)), min(h, int(y1))):
            row = (h - 1 - y) * w
            for x in range(max(0, int(x0)), min(w, int(x1))):
                i = (row + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b
    painter(rect, w, h)
    img = bpy.data.images.new(name, w, h, alpha=True); img.pixels = px
    img.filepath_raw = os.path.join(OUT, 'tex_' + name + '.png'); img.file_format = 'PNG'; img.save()
    img.colorspace_settings.name = 'sRGB'
    return img

def p_tile(rect, w, h):
    rect(0, 0, 64, 64, hexs('#efeae0')); rect(0, 59, 64, 64, hexs('#d6cfc0'))
    rect(15, 17, 49, 46, hexs('#3e4a58')); rect(17, 19, 30, 44, hexs('#55667a')); rect(31, 17, 33, 46, hexs('#e8e8e8')); rect(14, 46, 50, 49, hexs('#e4ded1'))
def p_balcony(rect, w, h):
    rect(0, 0, 64, 64, hexs('#eee8dc')); rect(8, 8, 56, 38, hexs('#3b4654')); rect(10, 10, 30, 36, hexs('#56687c')); rect(31, 8, 33, 38, hexs('#e6e6e6'))
    rect(0, 38, 64, 42, hexs('#d8d0c0')); rect(0, 42, 64, 59, hexs('#e4ded2'))
    for x in range(2, 64, 5): rect(x, 44, x + 1, 57, hexs('#aaa396'))
    rect(0, 59, 64, 64, hexs('#cbc2b2'))
def p_glass(rect, w, h):
    rect(0, 0, 64, 64, hexs('#93afbd')); rect(4, 4, 24, 52, hexs('#a9c2cd')); rect(0, 56, 64, 64, hexs('#5f7684'))
    rect(0, 55, 64, 56, hexs('#dbe6ea')); rect(0, 0, 1, 64, hexs('#dbe6ea')); rect(31, 0, 32, 64, hexs('#dbe6ea'))
def p_strip(rect, w, h):
    rect(0, 0, 64, 64, hexs('#e9e4d9')); rect(0, 15, 64, 46, hexs('#46525f')); rect(2, 17, 20, 44, hexs('#5c6b7a'))
    for x in range(0, 64, 16): rect(x, 15, x + 1, 46, hexs('#d8dde0'))
    rect(0, 59, 64, 64, hexs('#d2cbbd'))
def p_fins(rect, w, h):
    rect(0, 0, 64, 64, hexs('#8aa7b5'))
    for x in range(0, 64, 8): rect(x, 0, x + 3, 64, hexs('#eef2f3')); rect(x + 3, 0, x + 4, 64, hexs('#5d7684'))
    rect(0, 60, 64, 64, hexs('#6f8a97'))
def p_glass101(rect, w, h):
    rect(0, 0, 64, 256, hexs('#3f8f88'))
    for f in range(8):
        y = f * 32; rect(0, y, 64, y + 2, hexs('#9fdcd2')); rect(0, y + 29, 64, y + 32, hexs('#235752')); rect(4, y + 4, 26, y + 28, hexs('#5aa89e'))
    for x in range(0, 64, 6): rect(x, 0, x + 1, 256, hexs('#2f6b65'))
def p_road(rect, w, h):
    rect(0, 0, 256, 128, hexs('#5b5e60')); rect(0, 5, 256, 8, hexs('#e8e6dc')); rect(0, 120, 256, 123, hexs('#e8e6dc'))
    rect(0, 60, 256, 62, hexs('#e0bd4e')); rect(0, 66, 256, 68, hexs('#e0bd4e'))
    for x in range(0, 256, 48): rect(x, 32, x + 24, 34, hexs('#e8e6dc')); rect(x, 94, x + 24, 96, hexs('#e8e6dc'))
def p_cross(rect, w, h):
    rect(0, 0, 128, 128, hexs('#5b5e60'))
    for i in range(0, 128, 10):
        rect(i + 2, 5, i + 7, 25, hexs('#e8e6dc')); rect(i + 2, 103, i + 7, 123, hexs('#e8e6dc'))
        rect(5, i + 2, 25, i + 7, hexs('#e8e6dc')); rect(103, i + 2, 123, i + 7, hexs('#e8e6dc'))
def p_roof(rect, w, h):
    rect(0, 0, 64, 64, hexs('#a9a59a')); rect(3, 3, 61, 61, hexs('#cbc7bb')); rect(40, 40, 54, 54, hexs('#b9b5aa'))
def p_pave(rect, w, h):
    rect(0, 0, 64, 64, hexs('#d9d5c9'))
    for i in range(0, 64, 16): rect(i, 0, i + 1, 64, hexs('#c6c2b6')); rect(0, i, 64, i + 1, hexs('#c6c2b6'))

IMG = {k: new_image(k, 64, 64, f) for k, f in (('tile', p_tile), ('balcony', p_balcony), ('glass', p_glass), ('strip', p_strip), ('fins', p_fins), ('roof', p_roof), ('pave', p_pave))}
IMG['glass101'] = new_image('glass101', 64, 256, p_glass101)
IMG['road'] = new_image('road', 256, 128, p_road)
IMG['cross'] = new_image('cross', 128, 128, p_cross)
log('images')

def tex_mat(name, img, tint=(1, 1, 1), rough=0.85, spec=0.4, interp='Linear'):
    m = new_mat(name, rough=rough, spec=spec); nt = m.node_tree; b = bsdf_of(m)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = interp; t.extension = 'REPEAT'
    mx = mix_node(nt, 'MULTIPLY'); sock(mx, 'B', 'RGBA').default_value = (*tint, 1)
    nt.links.new(t.outputs['Color'], sock(mx, 'A', 'RGBA')); nt.links.new(sock(mx, 'Result', 'RGBA', True), b.inputs['Base Color'])
    return m

FAC_TINTS = {
    'tile': ['#ece4d5', '#dfd0ba', '#e8d5cc', '#d9d9d2', '#d2c7b0', '#e3dcc3', '#cfc2b6'],
    'balcony': ['#e2d8c8', '#e6dbcf', '#d8d2ca', '#cfc1b2', '#e9e2d7', '#dcc9bf'],
    'glass': ['#ffffff', '#d7e4e8', '#cbe0d6', '#e5ecef', '#b9d0d9'],
    'strip': ['#ffffff', '#ebe6dc', '#e0dcd4'],
}
FAC = {s: [tex_mat('fac_%s_%d' % (s, i), IMG[s], hexc(t), rough=0.45 if s == 'glass' else 0.85) for i, t in enumerate(ts)] for s, ts in FAC_TINTS.items()}
M_ROOF = tex_mat('roof', IMG['roof'], rough=0.95)
M_PAVE = tex_mat('pavement', IMG['pave'], rough=0.9)
M_ROAD = tex_mat('road', IMG['road'], rough=0.9, spec=0.2)
M_CROSS = tex_mat('cross', IMG['cross'], rough=0.9, spec=0.2)
M_TIN = [new_mat('tin_%d' % i, hexc(c), rough=0.55, metal=0.25) for i, c in enumerate(['#b7453a', '#3d5f8f', '#8d9496', '#6d7f5b'])]
M_CONCRETE = new_mat('concrete', hexc('#cfcbc0'), rough=0.9)
M_STEEL = new_mat('steel', hexc('#c9ccce'), rough=0.35, metal=0.9)
M_101 = tex_mat('glass101', IMG['glass101'], rough=0.25, spec=0.7)
M_GOLD = new_mat('gold', hexc('#c9a95a'), rough=0.35, metal=0.9)
M_DARKMETAL = new_mat('darkmetal', hexc('#4a5156'), rough=0.4, metal=0.8)
M_NANSHAN = tex_mat('nanshan', IMG['fins'], rough=0.4, spec=0.6)
M_WHITE = new_mat('white', hexc('#eef0ee'), rough=0.5)
M_FARGLORY = tex_mat('farglory', IMG['glass'], hexc('#8fa6b6'), rough=0.3, spec=0.6)
M_GROUND = vcol_mat('ground', rough=0.95, bump=[(14, 6, 0.25, 0.03)], var=0.06)
M_ROCK = vcol_mat('sandstone', rough=0.88, bump=[(16, 8, 0.45, 0.05), (55, 4, 0.2, 0.015)], var=0.18)
M_WOOD = new_mat('wood', hexc('#5a4330'), rough=0.85)
M_BARK = new_mat('bark', hexc('#6b5440'), rough=0.9)
M_FOL = [new_mat('foliage_%d' % i, hexc(c), rough=0.85, spec=0.25) for i, c in enumerate(['#5f8f3a', '#79a444', '#4f7f33', '#8cb64c', '#6c9b3f', '#a3b94c'])]
M_FERN = [new_mat('fern_%d' % i, hexc(c), rough=0.8) for i, c in enumerate(['#6fa64a', '#86b957', '#5c9040'])]
M_GRASS = [new_mat('grass_%d' % i, hexc(c), rough=0.9) for i, c in enumerate(['#6f9a3e', '#86ad48', '#5d8a36'])]
M_GRAVEL = [new_mat('gravel_%d' % i, hexc(c), rough=0.9) for i, c in enumerate(['#9c9283', '#b5a995', '#c77f45'])]
M_CAR = [new_mat('car_%d' % i, hexc(c), rough=0.35, spec=0.7) for i, c in enumerate(['#f2f2f0', '#c9ccd1', '#2d2f33', '#b8322c', '#2b4f9e', '#f0c020', '#f0c020', '#7a8a96', '#d9d3c4'])]
M_CARGLASS = new_mat('carglass', hexc('#222a33'), rough=0.2, spec=0.8)
M_TIRE = new_mat('tire', hexc('#1c1c1c'), rough=0.9)
M_BUS = [new_mat('bus_%d' % i, hexc(c), rough=0.4, spec=0.6) for i, c in enumerate(['#2b5ea7', '#2e8b57', '#e8e6e0'])]
M_SCOOT = [new_mat('scooter_%d' % i, hexc(c), rough=0.4) for i, c in enumerate(['#d9d9d6', '#2a2a2a', '#b42d2d', '#2f5fa8', '#e0a020'])]
M_RIDER = new_mat('rider', hexc('#3a3f4a'), rough=0.8)

# stair pavers: brick texture in object space
M_STONE = new_mat('stone', rough=0.9); nt = M_STONE.node_tree; _b = bsdf_of(M_STONE)
_tc = nt.nodes.new('ShaderNodeTexCoord'); _br = nt.nodes.new('ShaderNodeTexBrick')
_br.offset = 0.5; _br.offset_frequency = 2
_br.inputs['Scale'].default_value = 7.0; _br.inputs['Mortar Size'].default_value = 0.04; _br.inputs['Brick Width'].default_value = 1.0; _br.inputs['Row Height'].default_value = 0.5
_br.inputs['Color1'].default_value = (*hexc('#c9bca5'), 1); _br.inputs['Color2'].default_value = (*hexc('#b3a68e'), 1); _br.inputs['Mortar'].default_value = (*hexc('#6f6558'), 1)
nt.links.new(_tc.outputs['Object'], _br.inputs['Vector']); nt.links.new(_br.outputs['Color'], _b.inputs['Base Color'])
bump_chain(nt, _b, [(40, 4, 0.2, 0.01)])
log('materials')

# ───────────────────────── terrain ─────────────────────────
RX, RY, SLAB_BOTTOM = 4.8, 4.2, -0.5
def outline(th): return 1 + 0.06 * math.sin(3 * th + 1.1) + 0.045 * math.sin(5 * th + 2.6) + 0.03 * math.sin(8 * th + 0.4) + 0.02 * math.sin(13 * th + 2)
def inside(X, Y, m=0.0):
    a = X / RX; b = Y / RY; u = math.hypot(a, b); th = math.atan2(b, a); return u < outline(th) - m / 5.0
def base_h(X, Y, smooth_only=False):
    z = -Y
    t = clamp((z + 0.45) / 3.75, 0, 1); e = (t * t * (3 - 2 * t)) * 0.35 + t * 0.65
    h = 0.12 + 1.95 * e + 0.3 * smooth(3.0, 4.3, z)
    h -= 0.55 * smooth(1.6, 3.9, abs(X)) * smooth(0.0, 2.6, z)
    tw = 1 - smooth(0.5, 1.0, math.hypot((X - 0.2) / 1.1, (z - 3.3) / 0.6))
    h = lerp(h, 2.1, tw)
    if not smooth_only: h += 0.1 * fbm(X * 0.9 + 3, 0.5, z * 0.9 + 7, 3) * smooth(-0.3, 0.9, z) * (1 - tw)
    return h

# the stair path, downhill order, in Blender XY (Y = -z of the plan)
PATH = [(0.15, -4.3), (0.15, -3.35), (0.15, -1.8), (0.55, -0.95), (1.0, -0.35)]
PS = []  # samples: [x, y, s, tx, ty, h]
_s = 0.0
for i in range(len(PATH) - 1):
    (ax, ay), (bx, by) = PATH[i], PATH[i + 1]; L = math.hypot(bx - ax, by - ay); n = max(2, int(L / 0.01))
    for k in range(n):
        t = k / n; x = lerp(ax, bx, t); y = lerp(ay, by, t)
        PS.append([x, y, _s + t * L, (bx - ax) / L, (by - ay) / L, base_h(x, y, True)])
    _s += L
PS.append([PATH[-1][0], PATH[-1][1], _s, PS[-1][3], PS[-1][4], base_h(PATH[-1][0], PATH[-1][1], True)])
S_END = _s
_hs = [p[5] for p in PS]
for i, p in enumerate(PS):
    lo = max(0, i - 15); hi = min(len(PS), i + 16); p[5] = sum(_hs[lo:hi]) / (hi - lo)
def path_at(s):
    s = clamp(s, 0, S_END); i = min(len(PS) - 1, int(s / S_END * (len(PS) - 1)))
    while i < len(PS) - 1 and PS[i + 1][2] < s: i += 1
    while i > 0 and PS[i][2] > s: i -= 1
    return PS[i]
PS3 = PS[::3]
def nearest_path(X, Y):
    best = None; bd = 1e9
    for p in PS3:
        d = (p[0] - X) ** 2 + (p[1] - Y) ** 2
        if d < bd: bd = d; best = p
    return math.sqrt(bd), best
def terrain_h(X, Y):
    h = base_h(X, Y)
    if Y < 0.3:
        d, p = nearest_path(X, Y)
        if d < 0.7:
            w = 1 - smooth(0.26, 0.7, d); h = lerp(h, p[5] - 0.03, w)
    return h

# rocks: (x, y, sx, sy, sz, k, seed, yaw, tilt)
ROCKS = [(-0.78, -2.35, 0.74, 0.66, 0.84, 4.0, 1.0, 0.3, 0.08), (1.12, -2.45, 0.82, 0.72, 0.90, 3.6, 2.0, -0.4, -0.06),
         (-1.55, -3.0, 0.60, 0.53, 0.62, 3.8, 3.0, 0.9, 0.12), (1.45, -1.5, 0.53, 0.48, 0.55, 2.6, 4.0, 0.2, 0.0),
         (2.25, -2.45, 0.67, 0.50, 0.48, 4.2, 5.0, -0.7, 0.35), (-1.25, -1.4, 0.55, 0.48, 0.53, 3.2, 6.0, 1.4, -0.1)]
GRASS_C = (hexc('#56783a'), hexc('#88a54c')); SOIL_C = hexc('#8a6f4f'); PLAIN_C = hexc('#bdb9ab')
def ground_color(X, Y, h):
    n = fbm(X * 1.7, 0.3, Y * 1.7, 3)
    if h < 0.135 and Y > 0.3:
        return tuple(c * (1 + n * 0.05) for c in PLAIN_C)
    sx = (terrain_h(X + 0.04, Y) - terrain_h(X - 0.04, Y)) / 0.08; sy = (terrain_h(X, Y + 0.04) - terrain_h(X, Y - 0.04)) / 0.08
    slope = math.hypot(sx, sy)
    g = lerp3(GRASS_C[0], GRASS_C[1], n * 0.5 + 0.5)
    g = lerp3(g, hexc('#4f6e3d'), smooth(1.2, 2.6, h) * 0.4)
    w = smooth(0.8, 1.5, slope) * 0.7
    d, _ = nearest_path(X, Y); w += (1 - smooth(0.22, 0.55, d)) * 0.9
    for (rx, ry, sx_, sy_, sz_, *_r) in ROCKS:
        rad = max(sx_, sy_); w += (1 - smooth(rad * 0.9, rad * 1.35, math.hypot(X - rx, Y - ry))) * 0.85
    return lerp3(g, SOIL_C, clamp(w, 0, 1))

SEG, RINGS = 176, 52
verts = [(0.0, 0.0, terrain_h(0, 0))]; faces = []; cols = [ground_color(0, 0, verts[0][2])]
rim_h = []
for i in range(1, RINGS + 1):
    u = i / RINGS
    for j in range(SEG):
        th = j / SEG * 2 * math.pi; rho = outline(th)
        X = RX * rho * u * math.cos(th); Y = RY * rho * u * math.sin(th); h = terrain_h(X, Y)
        verts.append((X, Y, h)); cols.append(ground_color(X, Y, h))
        if i == RINGS: rim_h.append(h)
for j in range(SEG):
    faces.append((0, 1 + j, 1 + (j + 1) % SEG))
for i in range(1, RINGS):
    for j in range(SEG):
        a = 1 + (i - 1) * SEG + j; b = 1 + (i - 1) * SEG + (j + 1) % SEG; c = 1 + i * SEG + j; d = 1 + i * SEG + (j + 1) % SEG
        faces.append((a, b, d, c))
terrain = make_obj('Terrain', verts, faces, mats=[M_GROUND], colors=cols, smooth_shade=True)
log('terrain', len(verts))

# soil cliff + bottom
verts = []; faces = []; cols = []; K = 14
for k in range(K + 1):
    fr = k / K
    for j in range(SEG):
        th = j / SEG * 2 * math.pi; rho = outline(th)
        ins = 1 - 0.035 * smooth(0, 1, fr) + (0.014 * fbm(j * 0.21, k * 0.9, 3, 2) if 0 < k < K else 0)
        X = RX * rho * ins * math.cos(th); Y = RY * rho * ins * math.sin(th)
        z = lerp(rim_h[j], SLAB_BOTTOM, fr) if k > 0 else rim_h[j]
        verts.append((X, Y, z))
        n = fbm(j * 0.37, fr * 6, 1, 3)
        c = lerp3(hexc('#7a5c40'), hexc('#5a4430'), fr) if k > 0 else hexc('#6b5a3e')
        c = lerp3(c, hexc('#a07f58'), smooth(0.35, 0.45, fr) * (1 - smooth(0.5, 0.6, fr)) * 0.6)
        band = 0.5 + 0.5 * math.sin(fr * 16 + 1.8 * fbm(j * 0.15, 2, 3, 2))
        c = lerp3(c, hexc('#9a7a52'), band * 0.35 * smooth(0.04, 0.2, fr))
        cols.append(tuple(v * (1 + n * 0.12) for v in c))
for k in range(K):
    for j in range(SEG):
        a = k * SEG + j; b = k * SEG + (j + 1) % SEG; c = (k + 1) * SEG + j; d = (k + 1) * SEG + (j + 1) % SEG
        faces.append((a, c, d, b))
base = len(verts); verts.append((0, 0, SLAB_BOTTOM)); cols.append(hexc('#4a3827'))
for j in range(SEG): faces.append((base, K * SEG + (j + 1) % SEG, K * SEG + j))
make_obj('SlabWall', verts, faces, mats=[M_GROUND], colors=cols, smooth_shade=True)

# ───────────────────────── rocks ─────────────────────────
TAN, BROWN, CRUST, MOSS, LICHEN = hexc('#a98f6c'), hexc('#66503c'), hexc('#5d564e'), hexc('#5c6d38'), hexc('#a39a86')
rock_objs = []
for ri, (cx, cy, sx, sy, sz, k, sd, yaw, tilt) in enumerate(ROCKS):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=5, radius=1.0)
    cols = []; avg = (sx + sy + sz) / 3
    for v in bm.verts:
        n = v.co.normalized()
        r = (abs(n.x) ** k + abs(n.y) ** k + abs(n.z) ** k) ** (-1.0 / k)
        p = Vector((n.x * r * sx, n.y * r * sy, n.z * r * sz)); q = p + Vector((sd * 3.1, sd * 1.7, sd * 2.3))
        d = 0.13 * fbm(q.x * 1.4, q.y * 1.4, q.z * 1.4, 4) + 0.04 * fbm(q.x * 5, q.y * 5, q.z * 5, 3)
        pit = smooth(0.56, 0.8, vn01(q.x * 4.5 + 9, q.y * 4.5, q.z * 4.5)); d -= 0.075 * pit
        d += 0.02 * math.sin(p.z * 20 + 3.0 * fbm(q.x * 2, q.y * 2, q.z * 2, 2))
        v.co = p + n * d * avg * 0.9
        t = 0.5 + 0.5 * fbm(q.x * 2.2, q.y * 2.2, q.z * 2.2, 3)
        c = lerp3(TAN, BROWN, t); c = lerp3(c, CRUST, smooth(0.35, 0.9, n.z) * 0.5); c = lerp3(c, tuple(x * 0.8 for x in BROWN), pit * 0.7)
        moss = (1 - smooth(-0.6, -0.1, p.z / sz)) * (0.4 + 0.6 * vn01(q.x * 3, q.y * 3, q.z * 3)); c = lerp3(c, MOSS, moss * 0.85)
        lic = smooth(0.67, 0.75, vn01(q.x * 22, q.y * 22, q.z * 22)); c = lerp3(c, LICHEN, lic * 0.3)
        cols.append(c)
    me = bpy.data.meshes.new('Rock%d' % ri); bm.to_mesh(me); bm.free(); me.materials.append(M_ROCK)
    ca = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT'); flat = []
    for c in cols: flat.extend((c[0], c[1], c[2], 1.0))
    ca.data.foreach_set('color', flat); me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    gz = terrain_h(cx, cy)
    ob = bpy.data.objects.new('Rock%d' % ri, me); ob.location = (cx, cy, gz + sz * 0.72); ob.rotation_euler = (tilt, tilt * 0.5, yaw)
    COLL.objects.link(ob); rock_objs.append(ob)
log('rocks')

# ───────────────────────── stairs, railings, sign, lamp ─────────────────────────
verts = []; faces = []
s = 0.075
while s < S_END - 0.05:
    p = path_at(s); pu = path_at(s - 0.075); pd = path_at(s + 0.075)
    tx, ty = p[3], p[4]; nx, ny = ty, -tx
    hu, hd = pu[5], pd[5]
    top = hu + 0.006 if hu - hd > 0.02 else p[5] + 0.008
    bot = (hd - 0.09) if hu - hd > 0.02 else p[5] - 0.03
    cx, cy = p[0], p[1]
    M = Matrix(((tx, nx, 0, 0), (ty, ny, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)))
    add_box(verts, faces, (cx, cy, (top + bot) / 2), (0.152, 0.56, top - bot), mat=M)
    s += 0.15
make_obj('Stairs', verts, faces, mats=[M_STONE])

verts = []; faces = []
def post_and_rails(points, h=0.14):
    tops = []
    for (x, y) in points:
        z = terrain_h(x, y); add_box(verts, faces, (x, y, z + h / 2 - 0.02), (0.026, 0.026, h + 0.02)); tops.append((x, y, z - 0.02))
    for i in range(len(tops) - 1):
        (ax, ay, az), (bx, by, bz) = tops[i], tops[i + 1]
        for rh in (h * 0.55, h * 0.95):
            a = Vector((ax, ay, az + rh)); b = Vector((bx, by, bz + rh)); d = b - a; L = d.length; mid = (a + b) / 2
            yaw = math.atan2(d.y, d.x); pitch = -math.asin(d.z / L)
            M = Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(pitch, 4, 'Y')
            add_box(verts, faces, tuple(mid), (L, 0.014, 0.014), mat=M)
S_RAIL0 = next(p[2] for p in PS if p[1] > -2.0)
for side in (1, -1):
    pts = []; s = S_RAIL0
    while s < S_END - 0.1:
        p = path_at(s); pts.append((p[0] + p[4] * 0.34 * side, p[1] - p[3] * 0.34 * side)); s += 0.22
    post_and_rails(pts)
post_and_rails([(x, -2.98 + 0.03 * math.sin(x * 3)) for x in (-0.95, -0.72, -0.5, -0.3)], h=0.13)
post_and_rails([(x, -2.98) for x in (0.55, 0.78, 1.0)], h=0.13)
make_obj('Railings', verts, faces, mats=[M_WOOD])

sx_, sy_ = 0.78, -1.75; gz = terrain_h(sx_, sy_)
verts = []; faces = []; midx = []
add_box(verts, faces, (sx_, sy_, gz + 0.07), (0.022, 0.022, 0.16), midx=midx, mids=[0] * 6)
add_box(verts, faces, (sx_, sy_ - 0.01, gz + 0.165), (0.11, 0.012, 0.075), mat=Matrix.Rotation(-0.5, 4, 'X'), midx=midx, mids=[0, 0, 1, 0, 0, 0])
make_obj('Sign', verts, faces, mats=[M_WOOD, M_WHITE], midx=midx)
lx, ly = -1.08, -1.9; gz = terrain_h(lx, ly)
verts = []; faces = []; midx = []
add_cyl(verts, faces, (lx, ly, gz - 0.02), 0.009, 0.007, 0.46, 8, midx=midx, mi=0)
add_box(verts, faces, (lx + 0.05, ly, gz + 0.44), (0.1, 0.012, 0.012), midx=midx, mids=[0] * 6)
add_box(verts, faces, (lx + 0.1, ly, gz + 0.425), (0.045, 0.03, 0.02), midx=midx, mids=[1] * 6)
make_obj('Lamp', verts, faces, mats=[M_DARKMETAL, M_WHITE], midx=midx)
log('stairs')

# ───────────────────────── vegetation ─────────────────────────
def blob_mesh(name, blobs, mat, rough=0.12, sub=2):
    bm = bmesh.new()
    for (c, r) in blobs:
        g = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        for v in g['verts']:
            v.co = v.co * (1 + rough * mnoise.noise(v.co * 3.0 + Vector(c) * 7)) + Vector(c)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat); return me
CANOPY = {
    'A': [((0, 0, 0.42), 0.2), ((0.15, 0.05, 0.38), 0.17), ((-0.14, -0.06, 0.4), 0.16), ((0.02, 0.14, 0.47), 0.15), ((0, -0.13, 0.46), 0.14), ((0, 0, 0.56), 0.13)],
    'B': [((0, 0, 0.5), 0.17), ((0.08, 0.05, 0.62), 0.14), ((-0.06, -0.07, 0.72), 0.12), ((0, 0, 0.83), 0.09)],
    'C': [((0, 0, 0.11), 0.13), ((0.1, 0.04, 0.1), 0.1), ((-0.08, -0.05, 0.11), 0.09)],
}
CANOPY_M = {(t, i): blob_mesh('canopy_%s_%d' % (t, i), b, M_FOL[i]) for t, b in CANOPY.items() for i in range(len(M_FOL))}
verts = []; faces = []; add_cyl(verts, faces, (0, 0, 0), 0.03, 0.02, 0.46, 7)
TRUNK_M = bpy.data.meshes.new('trunk'); TRUNK_M.from_pydata(verts, [], faces); TRUNK_M.update(); TRUNK_M.materials.append(M_BARK)
TRUNK_M.polygons.foreach_set('use_smooth', [True] * len(TRUNK_M.polygons))
STREET_M = [blob_mesh('streettree_%d' % i, [((0, 0, 0.085), 0.045), ((0.02, 0.01, 0.1), 0.035)], M_FOL[i], 0.1, 1) for i in (0, 1, 4)]

def fern_mesh(name, mat):
    vs = []; fs = []
    for i in range(7):
        a = i / 7 * 2 * math.pi + 0.3; ca, sa = math.cos(a), math.sin(a)
        for (lx, ly, lz) in ((-0.018, 0, 0), (0.018, 0, 0), (0.012, 0.16, 0.09), (-0.012, 0.16, 0.09)):
            x = lx * ca - ly * sa; y = lx * sa + ly * ca; vs.append((x, y, lz))
        b = i * 4; fs.append((b, b + 1, b + 2, b + 3))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update(); me.materials.append(mat); return me
FERN_M = [fern_mesh('fern_%d' % i, m) for i, m in enumerate(M_FERN)]
def tuft_mesh(name, mat):
    vs = []; fs = []
    for i in range(3):
        a = i / 3 * math.pi; ca, sa = math.cos(a), math.sin(a)
        vs.extend([(-0.03 * ca, -0.03 * sa, 0), (0.03 * ca, 0.03 * sa, 0), (0.01 * ca, 0.01 * sa, 0.07)]); fs.append((3 * i, 3 * i + 1, 3 * i + 2))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update(); me.materials.append(mat); return me
TUFT_M = [tuft_mesh('tuft_%d' % i, m) for i, m in enumerate(M_GRASS)]
GRAVEL_M = []
for i, m in enumerate(M_GRAVEL):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.014)
    for v in bm.verts: v.co.z *= 0.45
    me = bpy.data.meshes.new('gravel_%d' % i); bm.to_mesh(me); bm.free(); me.materials.append(m); GRAVEL_M.append(me)

def rock_clear(X, Y, pad=0.1):
    for (rx, ry, sx, sy, *_r) in ROCKS:
        if math.hypot(X - rx, Y - ry) < max(sx, sy) * 1.05 + pad: return False
    return True
def in_corridor(X, Y): return -0.7 < X < 0.9 and -1.95 < Y < -0.45
def on_platform(X, Y): return math.hypot((X - 0.2) / 1.1, (Y + 3.3) / 0.6) < 0.62

n_tree = n_shrub = 0
for _ in range(1300):
    X = rr(-RX, RX); Y = rr(-RY, 0.25)
    if not inside(X, Y, 0.2) or Y > 0.2 or not rock_clear(X, Y, 0.28) or on_platform(X, Y): continue
    d, _p = nearest_path(X, Y)
    if d < 0.55: continue
    if base_h(X, Y, True) < 0.14: continue
    corridor = in_corridor(X, Y) or Y < -3.6
    kind = 'C' if (corridor and random.random() > 0.12) or random.random() < 0.3 else pick('AAB')
    if corridor and kind != 'C' and random.random() > 0.5: continue
    z = terrain_h(X, Y); s = rr(0.55, 0.9) * (1.0 if kind != 'C' else rr(0.7, 1.1)); yaw = rr(0, 6.28); ci = random.randrange(len(M_FOL))
    inst('Tree', CANOPY_M[(kind, ci)], (X, Y, z - 0.02), (0, 0, yaw), (s * rr(0.9, 1.1), s * rr(0.9, 1.1), s))
    if kind != 'C': inst('Trunk', TRUNK_M, (X, Y, z - 0.08), (0, 0, yaw), (s, s, s)); n_tree += 1
    else: n_shrub += 1
for _ in range(600):
    X = rr(-3.2, 3.2); Y = rr(-4.3, -0.4)
    if not inside(X, Y, 0.25) or not rock_clear(X, Y, 0.02): continue
    d, _p = nearest_path(X, Y)
    if d < 0.3 or (d > 1.4 and random.random() < 0.6): continue
    z = terrain_h(X, Y); inst('Fern', pick(FERN_M), (X, Y, z - 0.005), (0, 0, rr(0, 6.28)), (rr(0.8, 1.3),) * 3)
for _ in range(2400):
    X = rr(-RX, RX); Y = rr(-RY, 0.3)
    if not inside(X, Y, 0.2) or base_h(X, Y, True) < 0.14 or not rock_clear(X, Y, -0.02): continue
    d, _p = nearest_path(X, Y)
    if d < 0.3: continue
    z = terrain_h(X, Y); inst('Tuft', pick(TUFT_M), (X, Y, z - 0.004), (0, 0, rr(0, 6.28)), (rr(0.7, 1.3),) * 3)
for _ in range(400):
    X = rr(-2.5, 2.8); Y = rr(-4.0, -0.6)
    if not inside(X, Y, 0.2): continue
    d, _p = nearest_path(X, Y)
    near_rock = not rock_clear(X, Y, 0.25) and rock_clear(X, Y, -0.05)
    if not (d < 0.5 and d > 0.27) and not near_rock: continue
    z = terrain_h(X, Y); inst('Gravel', pick(GRAVEL_M), (X, Y, z), (rr(0, 1), rr(0, 1), rr(0, 6)), (rr(0.6, 1.4),) * 3)
log('vegetation', n_tree, n_shrub)

# ───────────────────────── people ─────────────────────────
def prim(name, kind, loc, size, mat, rot=(0, 0, 0), parent=None):
    bm = bmesh.new()
    if kind == 'sphere': bmesh.ops.create_uvsphere(bm, u_segments=18, v_segments=12, radius=1.0)
    elif kind == 'cyl': bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=1.0, radius2=1.0, depth=1.0)
    else: bmesh.ops.create_cube(bm, size=1.0)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    if kind != 'box': me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me); ob.location = loc; ob.scale = size; ob.rotation_euler = rot
    if parent: ob.parent = parent
    COLL.objects.link(ob); return ob
def person(name, loc, yaw, skin='#f3cfae', hair='#2e2419', top='#c94f3f', pants='#2f3a55', shoes='#2a2a2a', pack=None, pose='stand', hat=None):
    root = bpy.data.objects.new(name, None); root.location = loc; root.rotation_euler = (0, 0, yaw); COLL.objects.link(root)
    ms = {k: new_mat(name + k, hexc(v), rough=0.75) for k, v in (('skin', skin), ('hair', hair), ('top', top), ('pants', pants), ('shoes', shoes))}
    sit = pose == 'sit'; walk = pose == 'walk'
    legz = 0.02 if sit else 0.034
    for sgn, stride in ((-1, 0.45 if walk else 0), (1, -0.45 if walk else 0)):
        lrot = (math.pi / 2, 0, 0) if sit else (stride, 0, 0)
        prim(name + 'leg', 'sphere', (sgn * 0.013, 0.02 if sit else 0, legz), (0.013, 0.013, 0.03), ms['pants'], lrot, root)
        prim(name + 'shoe', 'box', (sgn * 0.013, (0.055 if sit else 0.006) + (0.01 * stride if walk else 0), 0.006 if not sit else 0.012), (0.02, 0.03, 0.012), ms['shoes'], (0, 0, 0), root)
    tz = 0.065 if sit else 0.085
    prim(name + 'torso', 'sphere', (0, 0, tz), (0.03, 0.026, 0.045), ms['top'], (0, 0, 0), root)
    for sgn in (-1, 1):
        if pose == 'photo': prim(name + 'arm', 'sphere', (sgn * 0.028, 0.03, tz + 0.02), (0.01, 0.03, 0.01), ms['top'], (0.25, 0, 0), root)
        elif pose == 'wave' and sgn == 1: prim(name + 'arm', 'sphere', (0.04, 0, tz + 0.045), (0.01, 0.01, 0.03), ms['top'], (0, 0.5, 0), root)
        else: prim(name + 'arm', 'sphere', (sgn * 0.036, 0, tz), (0.01, 0.01, 0.03), ms['top'], (0, sgn * 0.15, 0), root)
    if pose == 'photo': prim(name + 'phone', 'box', (0, 0.055, tz + 0.045), (0.024, 0.004, 0.034), M_DARKMETAL, (0, 0, 0), root)
    hz = tz + 0.072
    prim(name + 'head', 'sphere', (0, 0, hz), (0.036, 0.036, 0.036), ms['skin'], (0, 0, 0), root)
    prim(name + 'hair', 'sphere', (0, -0.005, hz + 0.012), (0.037, 0.038, 0.028), ms['hair'], (0, 0, 0), root)
    if hat: prim(name + 'hat', 'cyl', (0, 0, hz + 0.035), (0.045, 0.045, 0.008), new_mat(name + 'hatm', hexc(hat)), (0, 0, 0), root)
    if pack: prim(name + 'pack', 'box', (0, -0.035, tz), (0.045, 0.022, 0.055), new_mat(name + 'packm', hexc(pack)), (0, 0, 0), root)
    return root

def rock_top(ob, X, Y):
    bpy.context.view_layer.update()
    inv = ob.matrix_world.inverted(); o = inv @ Vector((X, Y, 10)); d = (inv.to_3x3() @ Vector((0, 0, -1))).normalized()
    hit, loc, nrm, idx = ob.ray_cast(o, d)
    return (ob.matrix_world @ loc).z if hit else None
p = path_at(S_RAIL0 - 0.9)
person('HikerA', (p[0] + 0.03, p[1], p[5] + 0.01), math.pi, top='#2f6b4e', pants='#1f2a44', pack='#7b3f8c', pose='walk')
person('HikerB', (p[0] - 0.08, p[1] + 0.16, path_at(S_RAIL0 - 1.06)[5] + 0.01), math.pi, hair='#4a2c18', top='#d9d4c7', pants='#3b3f55', pack='#c7453f', pose='walk')
person('Photographer', (0.78, -1.45, terrain_h(0.78, -1.45)), math.pi, top='#e8b63c', pants='#2d2d2d', pose='photo', hat='#f2f0e6')
zt = rock_top(rock_objs[1], 0.9, -2.55)
if zt: person('Sitter', (0.9, -2.55, zt - 0.005), math.pi, top='#3f6fb5', pants='#5a4a3a', pose='sit', hair='#1a1a1a')
person('Waver', (-0.42, -3.25, terrain_h(-0.42, -3.25)), math.pi + 0.3, top='#c64e7a', pants='#2f3a55', pose='wave', hair='#5a3a22')
kid = person('Kid', (-0.25, -3.3, terrain_h(-0.25, -3.3)), math.pi - 0.2, top='#f0d04a', pants='#3a6fb0', hair='#2e2419'); kid.scale = (0.7, 0.7, 0.7)
log('people')

# ───────────────────────── city ─────────────────────────
PHI = 0.5; CPHI, SPHI = math.cos(PHI), math.sin(PHI); CX, CY = 0.3, 2.3
def cw(xl, yl): return (CX + xl * CPHI - yl * SPHI, CY + xl * SPHI + yl * CPHI)
def on_plain(X, Y, m=0.1): return inside(X, Y, m) and base_h(X, Y, True) < 0.135
L101 = (-0.3, 1.95); LNAN = (0.8, 2.4); LFAR = (1.5, 2.85)
colW = [0.7, 0.55, 0.85, 0.6, 0.75, 0.65, 0.9, 0.6, 0.7, 0.8, 0.6, 0.75, 0.65, 0.8]
rowD = [0.55, 0.65, 0.45, 0.7, 0.5, 0.6, 0.5, 0.65, 0.55, 0.6, 0.5]
roadWx = [0.26 if i % 3 == 1 else 0.15 for i in range(len(colW) + 1)]
roadWy = [0.22 if j % 2 == 0 else 0.14 for j in range(len(rowD) + 1)]
cols = []; roadsV = []; x = -(sum(colW) + sum(roadWx)) / 2
for i, w in enumerate(colW):
    roadsV.append((x + roadWx[i] / 2, roadWx[i])); x += roadWx[i]; cols.append((x, x + w)); x += w
roadsV.append((x + roadWx[-1] / 2, roadWx[-1]))
rows = []; roadsH = []; y = -(sum(rowD) + sum(roadWy)) / 2
for j, d in enumerate(rowD):
    roadsH.append((y + roadWy[j] / 2, roadWy[j])); y += roadWy[j]; rows.append((y, y + d)); y += d
roadsH.append((y + roadWy[-1] / 2, roadWy[-1]))

def corners_ok(x0, x1, y0, y1, m=0.08):
    return all(on_plain(*cw(px, py), m) for px, py in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)))

rv = []; rf = []; ruv = []; rmi = []
ROAD_Z = 0.123
road_runs = {}
for i, (xc, w) in enumerate(roadsV):
    for (y0, y1) in rows:
        if corners_ok(xc - w / 2, xc + w / 2, y0, y1):
            L = (y1 - y0) / 1.0
            add_quad(rv, rf, [(xc - w / 2, y0, ROAD_Z), (xc + w / 2, y0, ROAD_Z), (xc + w / 2, y1, ROAD_Z), (xc - w / 2, y1, ROAD_Z)], ruv, [(0, 0), (0, 1), (L, 1), (L, 0)], rmi, 0)
            road_runs.setdefault(('V', i), []).append((y0, y1))
for j, (yc, w) in enumerate(roadsH):
    for (x0, x1) in cols:
        if corners_ok(x0, x1, yc - w / 2, yc + w / 2):
            L = (x1 - x0) / 1.0
            add_quad(rv, rf, [(x0, yc - w / 2, ROAD_Z), (x1, yc - w / 2, ROAD_Z), (x1, yc + w / 2, ROAD_Z), (x0, yc + w / 2, ROAD_Z)], ruv, [(0, 0), (L, 0), (L, 1), (0, 1)], rmi, 0)
            road_runs.setdefault(('H', j), []).append((x0, x1))
for i, (xc, wx) in enumerate(roadsV):
    for j, (yc, wy) in enumerate(roadsH):
        if corners_ok(xc - wx / 2, xc + wx / 2, yc - wy / 2, yc + wy / 2):
            add_quad(rv, rf, [(xc - wx / 2, yc - wy / 2, ROAD_Z + 0.0008), (xc + wx / 2, yc - wy / 2, ROAD_Z + 0.0008), (xc + wx / 2, yc + wy / 2, ROAD_Z + 0.0008), (xc - wx / 2, yc + wy / 2, ROAD_Z + 0.0008)], ruv, None, rmi, 1)
            road_runs.setdefault(('V', i), []).append((yc - wy / 2, yc + wy / 2)); road_runs.setdefault(('H', j), []).append((xc - wx / 2, xc + wx / 2))
make_obj('Roads', rv, rf, mats=[M_ROAD, M_CROSS], uvs=ruv, midx=rmi, loc=(CX, CY, 0), rot=(0, 0, PHI))
_cands = [(abs(cw(0, yc)[1] - 1.2), yc) for (yc, w) in roadsH if w >= 0.2]
_yc = min(_cands)[1]; _sp = cw(2.4, _yc); _st = cw(-1.2, _yc)
STREET_VIEW = ((_sp[0], _sp[1], 0.62), (_st[0], _st[1], 0.3))
def longest_run(ivs):
    ivs = sorted(ivs); runs = []; cur = None
    for a, b in ivs:
        if cur and a <= cur[1] + 1e-4: cur[1] = max(cur[1], b)
        else: cur = [a, b]; runs.append(cur)
    return max(runs, key=lambda r: r[1] - r[0]) if runs else None

pv = []; pf = []; puv = []
for (x0, x1) in cols:
    for (y0, y1) in rows:
        if corners_ok(x0, x1, y0, y1, 0.05):
            add_box(pv, pf, ((x0 + x1) / 2, (y0 + y1) / 2, 0.12 + 0.008), (x1 - x0, y1 - y0, 0.016), uvs=puv, uv_div=(0.1, 0.1))
make_obj('Pavement', pv, pf, mats=[M_PAVE], uvs=puv, loc=(CX, CY, 0), rot=(0, 0, PHI))

FLOOR, BAY = 0.03, 0.045
def zone(X, Y):
    d101 = math.hypot(X - L101[0], Y - L101[1])
    if Y < 1.1: return 'foot'
    if d101 < 1.5: return 'core'
    if Y > 3.3 or abs(X) > 3.3: return 'edge'
    return 'mid'
n_bld = 0
def building(xl, yl, w, d, style, floors, tint_i, extras=True):
    global n_bld
    X, Y = cw(xl, yl)
    for px, py in ((xl - w / 2, yl - d / 2), (xl + w / 2, yl - d / 2), (xl + w / 2, yl + d / 2), (xl - w / 2, yl + d / 2)):
        if not on_plain(*cw(px, py), 0.12): return
    for (lx, ly, r) in ((L101[0], L101[1], 0.55), (LNAN[0], LNAN[1], 0.36), (LFAR[0], LFAR[1], 0.3)):
        if math.hypot(X - lx, Y - ly) < r: return
    h = floors * FLOOR
    verts = []; faces = []; uvs = []; midx = []
    mats = [FAC[style][tint_i], M_ROOF, pick(M_TIN), M_CONCRETE, M_STEEL]
    tower = style == 'glass' and floors >= 26
    if tower:
        add_box(verts, faces, (0, 0, 0.045), (w, d, 0.09), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[1, 1, 0, 0, 0, 0])
        tw, td = w * rr(0.7, 0.85), d * rr(0.7, 0.85)
        add_box(verts, faces, (0, 0, 0.09 + (h - 0.09) / 2), (tw, td, h - 0.09), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[1, 1, 0, 0, 0, 0])
        add_box(verts, faces, (0, 0, h + 0.015), (tw * 0.4, td * 0.4, 0.03), uvs=uvs, midx=midx, mids=[3] * 6)
    else:
        add_box(verts, faces, (0, 0, h / 2), (w, d, h), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[1, 1, 0, 0, 0, 0])
        if extras and style in ('tile', 'balcony') and random.random() < 0.6:
            aw, ad = w * rr(0.5, 0.8), d * rr(0.45, 0.7)
            add_box(verts, faces, (rr(-1, 1) * (w - aw) / 2, rr(-1, 1) * (d - ad) / 2, h + 0.018), (aw, ad, 0.036), uvs=uvs, midx=midx, mids=[2, 2, 3, 3, 3, 3])
        elif extras and random.random() < 0.5:
            add_box(verts, faces, (rr(-1, 1) * w * 0.25, rr(-1, 1) * d * 0.25, h + 0.015), (w * 0.3, d * 0.3, 0.03), uvs=uvs, midx=midx, mids=[3] * 6)
        if extras and random.random() < 0.65:
            add_cyl(verts, faces, (w * 0.3 * (1 if random.random() < 0.5 else -1), d * 0.3 * (1 if random.random() < 0.5 else -1), h + 0.006), 0.012, 0.012, 0.022, 8, midx=midx, mi=4, uvs=uvs)
    make_obj('Bld', verts, faces, mats=mats, uvs=uvs, midx=midx, loc=(X, Y, 0.136), rot=(0, 0, PHI))
    n_bld += 1
for (x0, x1) in cols:
    for (y0, y1) in rows:
        bw = x1 - x0; bd = y1 - y0; cxw, cyw = cw((x0 + x1) / 2, (y0 + y1) / 2)
        if not on_plain(cxw, cyw, -0.3): continue
        zn = zone(cxw, cyw)
        half = bd / 2
        for (yl0, side) in ((y0, 1), (y1, -1)):
            x = x0 + 0.035
            while x1 - 0.035 - x > 0.07:
                lot = rr(0.1, 0.2) if zn == 'foot' else rr(0.2, 0.42) if zn == 'core' else rr(0.14, 0.3) if zn == 'mid' else rr(0.12, 0.22)
                if x1 - 0.035 - x - lot < 0.07: lot = x1 - 0.035 - x
                depth = (half - 0.035) * rr(0.72, 0.95); r = random.random()
                if zn == 'foot': style, floors = ('tile', random.randint(4, 6)) if r < 0.6 else ('balcony', random.randint(9, 15))
                elif zn == 'core': style, floors = ('glass', random.randint(18, 30)) if r < 0.5 else ('glass', random.randint(28, 42)) if r < 0.68 else ('strip', random.randint(12, 20)) if r < 0.85 else ('balcony', random.randint(10, 16))
                elif zn == 'mid': style, floors = ('balcony', random.randint(9, 15)) if r < 0.45 else ('glass', random.randint(12, 22)) if r < 0.7 else ('strip', random.randint(10, 16)) if r < 0.85 else ('tile', random.randint(4, 6))
                else: style, floors = ('tile', random.randint(4, 6)) if r < 0.45 else ('balcony', random.randint(8, 13)) if r < 0.85 else ('strip', random.randint(8, 14))
                gap = 0.0 if style == 'tile' else rr(0.008, 0.02)
                building(x + lot / 2, yl0 + side * (0.035 + depth / 2), lot - gap, depth, style, floors, random.randrange(len(FAC[style])))
                x += lot
for (X, Y, fl) in ((-3.1, -0.05, 12), (-2.35, 0.1, 10), (-1.6, -0.15, 13), (-0.95, 0.15, 11), (1.6, 0.05, 12), (2.25, -0.2, 10), (2.95, 0.05, 13), (3.55, 0.3, 9), (-3.8, 0.35, 8), (0.35, 0.3, 9)):
    w, d = rr(0.2, 0.26), rr(0.16, 0.2)
    R2 = Matrix.Rotation(PHI, 2)
    zs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            off = R2 @ Vector((sx * w / 2, sy * d / 2)); zs.append(terrain_h(X + off.x, Y + off.y))
    base = min(zs) - 0.06; h = max(fl * FLOOR, max(zs) - base + 0.25)
    verts = []; faces = []; uvs = []; midx = []
    add_box(verts, faces, (0, 0, h / 2), (w, d, h), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[1, 1, 0, 0, 0, 0])
    add_box(verts, faces, (w * 0.15, -d * 0.1, h + 0.015), (w * 0.35, d * 0.35, 0.03), uvs=uvs, midx=midx, mids=[3] * 6)
    make_obj('HillBld', verts, faces, mats=[FAC['balcony'][random.randrange(len(FAC['balcony']))], M_ROOF, M_TIN[2], M_CONCRETE], uvs=uvs, midx=midx, loc=(X, Y, base), rot=(0, 0, PHI))
    n_bld += 1
log('buildings', n_bld)

# landmarks ---------------------------------------------------------------
def frustum(verts, faces, uvs, midx, z0, a0, a1, h, mi=0, bay=0.05, floors_v=1.0):
    b = len(verts)
    for (a, z) in ((a0, z0), (a1, z0 + h)):
        verts.extend([(-a, -a, z), (a, -a, z), (a, a, z), (-a, a, z)])
    for i in range(4):
        j = (i + 1) % 4; faces.append((b + i, b + j, b + 4 + j, b + 4 + i)); midx.append(mi)
        w0 = 2 * a0 / bay; w1 = 2 * a1 / bay
        uvs.append([(0, 0), (w0, 0), (w1, floors_v), (0, floors_v)])
    faces.append((b + 4, b + 5, b + 6, b + 7)); midx.append(mi); uvs.append([(0, 0), (1, 0), (1, 1), (0, 1)])
verts = []; faces = []; uvs = []; midx = []
z = 0.0
frustum(verts, faces, uvs, midx, z, 0.30, 0.19, 0.62, 0, 0.05, 25 / 8); z += 0.62
for sgi in range(8):
    frustum(verts, faces, uvs, midx, z, 0.15, 0.185, 0.19, 0, 0.05, 1.0)
    add_box(verts, faces, (0, 0, z + 0.19 + 0.006), (0.36, 0.36, 0.012), uvs=uvs, midx=midx, mids=[2] * 6)
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_box(verts, faces, (sx * 0.185, sy * 0.185, z + 0.17), (0.035, 0.035, 0.035), uvs=uvs, midx=midx, mids=[1] * 6)
    z += 0.202
for (a, hh) in ((0.085, 0.07), (0.06, 0.07), (0.04, 0.06)):
    add_box(verts, faces, (0, 0, z + hh / 2), (2 * a, 2 * a, hh), uvs=uvs, midx=midx, mids=[2] * 6); z += hh
add_cyl(verts, faces, (0, 0, z), 0.012, 0.003, 0.45, 8, midx=midx, mi=2, uvs=uvs)
# coin medallions standing on the four base faces
for i in range(4):
    a = i * math.pi / 2; M = Matrix.Rotation(a, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X')
    cx_, cy_ = 0.28 * math.cos(a + math.pi / 2), 0.28 * math.sin(a + math.pi / 2)
    add_box(verts, faces, (cx_, cy_, 0.36), (0.09, 0.09, 0.012), mat=M, uvs=uvs, midx=midx, mids=[1] * 6)
add_box(verts, faces, (0.0, 0.55, 0.075), (0.78, 0.5, 0.15), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[3, 3, 4, 4, 4, 4])
X, Y = L101
make_obj('Taipei101', verts, faces, mats=[M_101, M_GOLD, M_DARKMETAL, M_ROOF, FAC['glass'][1]], uvs=uvs, midx=midx, loc=(X, Y, 0.136), rot=(0, 0, PHI + 0.25), scale=(1.3, 1.3, 1.3))

verts = []; faces = []; uvs = []; midx = []
w, d, h = 0.3, 0.25, 1.36
c = 0.045
poly = [(-w / 2 + c, -d / 2), (w / 2 - c, -d / 2), (w / 2, -d / 2 + c), (w / 2, d / 2 - c), (w / 2 - c, d / 2), (-w / 2 + c, d / 2), (-w / 2, d / 2 - c), (-w / 2, -d / 2 + c)]
tops = [h, h + 0.06, h + 0.12, h + 0.17, h + 0.14, h + 0.08, h + 0.02, h - 0.02]
b = len(verts)
for (px, py) in poly: verts.append((px, py, 0))
for k, (px, py) in enumerate(poly): verts.append((px, py, tops[k]))
n = len(poly)
for i in range(n):
    j = (i + 1) % n; faces.append((b + i, b + j, b + n + j, b + n + i)); midx.append(0)
    L = math.hypot(poly[j][0] - poly[i][0], poly[j][1] - poly[i][1]) / BAY; uvs.append([(0, 0), (L, 0), (L, tops[j] / FLOOR), (0, tops[i] / FLOOR)])
faces.append(tuple(b + n + i for i in range(n))); midx.append(1); uvs.append([(0.5 + px, 0.5 + py) for px, py in poly])
add_box(verts, faces, (0.04, 0.02, h + 0.22), (0.12, 0.1, 0.16), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[1, 1, 0, 0, 0, 0])
add_box(verts, faces, (0, -0.33, 0.06), (0.55, 0.36, 0.12), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[2, 2, 3, 3, 3, 3])
X, Y = LNAN
make_obj('NanShan', verts, faces, mats=[M_NANSHAN, M_WHITE, M_ROOF, FAC['glass'][2]], uvs=uvs, midx=midx, loc=(X, Y, 0.136), rot=(0, 0, PHI + 0.25), scale=(1.3, 1.3, 1.3))
verts = []; faces = []
for i in range(9):
    t = i / 8; x = lerp(-0.27, 0.27, t); zz = 0.12 + 0.035 * math.sin(t * math.pi)
    verts.extend([(x, -0.5, zz), (x, -0.16, zz)])
for i in range(8): faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
make_obj('NanShanRoof', verts, faces, mats=[M_WHITE], loc=(X, Y, 0.136), rot=(0, 0, PHI + 0.25), smooth_shade=True, scale=(1.3, 1.3, 1.3))

verts = []; faces = []; uvs = []; midx = []
add_box(verts, faces, (0, 0, 0.52), (0.22, 0.2, 1.04), uvs=uvs, uv_div=(BAY, FLOOR), midx=midx, mids=[1, 1, 0, 0, 0, 0])
for sx in (-1, 1): add_box(verts, faces, (sx * 0.1, 0, 1.08), (0.02, 0.2, 0.08), uvs=uvs, midx=midx, mids=[2] * 6)
add_box(verts, faces, (0, 0, 1.115), (0.22, 0.2, 0.02), uvs=uvs, midx=midx, mids=[2] * 6)
X, Y = LFAR
make_obj('Farglory', verts, faces, mats=[M_FARGLORY, M_ROOF, M_WHITE], uvs=uvs, midx=midx, loc=(X, Y, 0.136), rot=(0, 0, PHI + 0.25), scale=(1.3, 1.3, 1.3))
log('landmarks')

# traffic -------------------------------------------------------------------
def vehicle_mesh(name, paint, boxes, second):
    verts = []; faces = []; midx = []
    for (c, s, mi) in boxes: add_box(verts, faces, c, s, midx=midx, mids=[mi] * 6)
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for m in (paint, second, M_TIRE): me.materials.append(m)
    me.polygons.foreach_set('material_index', midx); return me
CAR_BOXES = [((0, 0, 0.014), (0.075, 0.038, 0.02), 0), ((-0.004, 0, 0.031), (0.04, 0.032, 0.016), 1), ((-0.004, 0, 0.0395), (0.03, 0.028, 0.004), 0)] + \
    [((sx * 0.024, sy * 0.017, 0.007), (0.014, 0.008, 0.014), 2) for sx in (-1, 1) for sy in (-1, 1)]
BUS_BOXES = [((0, 0, 0.022), (0.13, 0.042, 0.03), 0), ((0, 0, 0.044), (0.128, 0.04, 0.014), 1), ((0, 0, 0.053), (0.126, 0.038, 0.006), 0)] + \
    [((sx * 0.045, sy * 0.019, 0.007), (0.016, 0.008, 0.014), 2) for sx in (-1, 1) for sy in (-1, 1)]
SCOOT_BOXES = [((0, 0, 0.009), (0.03, 0.011, 0.01), 0), ((-0.004, 0, 0.022), (0.012, 0.012, 0.018), 1), ((-0.004, 0, 0.036), (0.01, 0.01, 0.01), 1)] + \
    [((sx * 0.011, 0, 0.005), (0.009, 0.004, 0.009), 2) for sx in (-1, 1)]
CAR_M = [vehicle_mesh('car_%d' % i, m, CAR_BOXES, M_CARGLASS) for i, m in enumerate(M_CAR)]
BUS_M = [vehicle_mesh('bus_%d' % i, m, BUS_BOXES, M_CARGLASS) for i, m in enumerate(M_BUS)]
SCOOT_M = [vehicle_mesh('scooter_%d' % i, m, SCOOT_BOXES, M_RIDER) for i, m in enumerate(M_SCOOT)]
n_car = n_scoot = n_tree_st = 0
def place_vehicle(mesh, kind, xl, yl, yaw_l, z=0.1235, lane=None):
    X, Y = cw(xl, yl); ob = inst(kind, mesh, (X, Y, z), (0, 0, PHI + yaw_l))
    if lane: ob['lane'] = {'axis': lane[0], 'idx': lane[1], 'dir': lane[2], 'off': lane[3], 'a': lane[4], 'b': lane[5]}
    return ob
for key, ivs in road_runs.items():
    run = longest_run(ivs)
    if not run: continue
    axis, idx = key; (c, w) = (roadsV if axis == 'V' else roadsH)[idx]
    a, b = run[0] + 0.05, run[1] - 0.05
    if b - a < 0.4: continue
    major = w >= 0.2
    lane_offs = [0.035, 0.085] if major else [0.04]
    for d in (1, -1):
        for off in lane_offs:
            if axis == 'V': dirv = (0, d); rightv = (d, 0)
            else: dirv = (d, 0); rightv = (0, -d)
            spacing = rr(0.28, 0.5) if major else rr(0.4, 0.7)
            s = a + rr(0, spacing)
            while s < b:
                px = (c + rightv[0] * off) if axis == 'V' else s; py = s if axis == 'V' else (c + rightv[1] * off)
                yaw = math.atan2(dirv[1], dirv[0])
                if major and off > 0.05 and random.random() < 0.12:
                    place_vehicle(pick(BUS_M), 'Bus', px, py, yaw, lane=[axis, idx, d, off, a, b]); s += 0.1
                else:
                    place_vehicle(pick(CAR_M), 'Car', px, py, yaw, lane=[axis, idx, d, off, a, b])
                n_car += 1; s += spacing
            curb = w / 2 - 0.022; s = a + rr(0, 0.3)
            while s < b:
                px = (c + rightv[0] * curb) if axis == 'V' else s; py = s if axis == 'V' else (c + rightv[1] * curb)
                place_vehicle(pick(SCOOT_M), 'Scooter', px, py, math.atan2(dirv[1], dirv[0]), lane=[axis, idx, d, curb, a, b]); n_scoot += 1; s += rr(0.18, 0.45)
    for (ia, ib) in ivs:
        if ib - ia < 0.3: continue
        for side in (1, -1):
            if major and random.random() < 0.55:
                s = ia + 0.04
                while s < ib - 0.04:
                    px = (c + side * (w / 2 + 0.014)) if axis == 'V' else s; py = s if axis == 'V' else (c + side * (w / 2 + 0.014))
                    yaw = (0 if axis == 'V' else math.pi / 2) + rr(-0.15, 0.15)
                    place_vehicle(pick(SCOOT_M), 'ParkedScooter', px, py, yaw, z=0.137); n_scoot += 1; s += 0.028
            if major:
                s = ia + 0.08
                while s < ib - 0.05:
                    px = (c + side * (w / 2 + 0.045)) if axis == 'V' else s; py = s if axis == 'V' else (c + side * (w / 2 + 0.045))
                    X, Y = cw(px, py)
                    if on_plain(X, Y, 0.1):
                        inst('StreetTree', pick(STREET_M), (X, Y, 0.137), (0, 0, rr(0, 6)), (rr(0.8, 1.2),) * 3); inst('StreetTrunk', TRUNK_M, (X, Y, 0.137), (0, 0, 0), (0.22, 0.22, 0.2)); n_tree_st += 1
                    s += 0.17
log('traffic', n_car, n_scoot, n_tree_st)

# ───────────────────────── lights, camera, render ─────────────────────────
world = bpy.data.worlds.new('World'); world.use_nodes = True; scene.world = world
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.62, 0.72, 0.85, 1); bg.inputs['Strength'].default_value = 0.7
def light(name, kind, loc, energy, **kw):
    L = bpy.data.lights.new(name, kind); L.energy = energy
    for k, v in kw.items(): setattr(L, k, v)
    ob = bpy.data.objects.new(name, L); ob.location = loc
    d = Vector((0, 0.3, 0.6)) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); COLL.objects.link(ob); return ob
light('Sun', 'SUN', (-6.5, -8.0, 12.0), 4.2, angle=math.radians(2.5), color=(1.0, 0.95, 0.88))
light('Fill', 'AREA', (9.0, -7.0, 7.0), 260.0, size=7.0, color=(0.85, 0.92, 1.0))
light('Rim', 'AREA', (-4.0, 9.0, 6.0), 220.0, size=6.0, color=(1.0, 0.97, 0.9))

verts = [(-9, -9, SLAB_BOTTOM - 0.001), (9, -9, SLAB_BOTTOM - 0.001), (9, 9, SLAB_BOTTOM - 0.001), (-9, 9, SLAB_BOTTOM - 0.001)]
catcher = make_obj('ShadowCatcher', verts, [(0, 1, 2, 3)], mats=[new_mat('catcher', (0.8, 0.8, 0.8))]); catcher.is_shadow_catcher = True

cam_data = bpy.data.cameras.new('Cam'); cam_data.sensor_fit = 'VERTICAL'; cam_data.angle_y = math.radians(42)
cam_data.clip_start = 0.1; cam_data.clip_end = 200
cam = bpy.data.objects.new('Cam', cam_data); COLL.objects.link(cam); scene.camera = cam
VIEWS = {
    'hero': ((2.6, -12.4, 9.0), (0.0, 0.0, 1.0)),
    'rocks': ((1.7, -5.6, 3.9), (0.1, -2.3, 2.3)),
    'street': STREET_VIEW,
    'back': ((-2.0, 11.5, 7.5), (0.0, 0.2, 1.0)),
}
def set_view(name):
    pos, tgt = VIEWS[name]; cam.location = pos
    d = Vector(tgt) - Vector(pos); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_data.dof.use_dof = True; cam_data.dof.focus_distance = (Vector((0.2, -2.4, 2.2)) - Vector(pos)).length; cam_data.dof.aperture_fstop = 9.0
set_view('hero')

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = (d.type == 'METAL')
    scene.cycles.device = 'GPU'
except Exception as e:
    print('GPU setup failed, CPU fallback:', e)
scene.render.film_transparent = True
scene.cycles.use_denoising = True; scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.use_adaptive_sampling = True; scene.cycles.adaptive_threshold = 0.03
scene.cycles.max_bounces = 6; scene.cycles.diffuse_bounces = 3; scene.cycles.glossy_bounces = 3
scene.view_settings.view_transform = 'AgX'
try: scene.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'

def render(name, w, h, samples, view='hero'):
    set_view(view); scene.render.resolution_x = w; scene.render.resolution_y = h; scene.render.resolution_percentage = 100
    scene.cycles.samples = samples; scene.render.filepath = os.path.join(OUT, name + '.png')
    t = time.time(); bpy.ops.render.render(write_still=True); log('rendered', name, '%.0fs' % (time.time() - t))

log('scene objects', len(COLL.objects))
def bake_object(ob, size, normal=False, rough=0.9):
    for o in bpy.data.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    me = ob.data; mat = me.materials[0]; nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active = tex
    outs = {}
    for kind in (['DIFFUSE'] + (['NORMAL'] if normal else [])):
        img = bpy.data.images.new('%s_%s' % (ob.name, kind.lower()), size, size, alpha=False)
        if kind == 'NORMAL': img.colorspace_settings.name = 'Non-Color'
        tex.image = img
        scene.render.bake.use_pass_direct = False; scene.render.bake.use_pass_indirect = False; scene.render.bake.use_pass_color = True
        bpy.ops.object.bake(type=kind, margin=4, use_clear=True)
        img.filepath_raw = os.path.join(OUT, img.name + '.png'); img.file_format = 'PNG'; img.save(); outs[kind] = img
    nt.nodes.remove(tex)
    m2 = new_mat(ob.name + '_baked', rough=rough); n2 = m2.node_tree; b2 = bsdf_of(m2)
    t2 = n2.nodes.new('ShaderNodeTexImage'); t2.image = outs['DIFFUSE']; n2.links.new(t2.outputs['Color'], b2.inputs['Base Color'])
    if normal:
        tn = n2.nodes.new('ShaderNodeTexImage'); tn.image = outs['NORMAL']; nm = n2.nodes.new('ShaderNodeNormalMap')
        n2.links.new(tn.outputs['Color'], nm.inputs['Color']); n2.links.new(nm.outputs['Normal'], b2.inputs['Normal'])
    me.materials[0] = m2

def export_glb():
    scene.cycles.samples = 16; scene.cycles.use_denoising = False
    t = time.time()
    for ob in rock_objs: bake_object(ob, 1024, normal=True, rough=0.88)
    bake_object(terrain, 2048, rough=0.95)
    bake_object(bpy.data.objects['SlabWall'], 1024, rough=0.95)
    bake_object(bpy.data.objects['Stairs'], 512, rough=0.9)
    log('baked', '%.0fs' % (time.time() - t))
    bpy.data.objects.remove(bpy.data.objects['ShadowCatcher'])
    scene['city'] = {'phi': PHI, 'cx': CX, 'cy': CY}
    path = os.path.join(OUT, 'xiangshan.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, export_extras=True,
                              export_cameras=False, export_lights=False, export_image_format='JPEG', export_jpeg_quality=82, use_visible=True)
    log('exported glb', os.path.getsize(path) // 1024, 'KB')

if MODE == 'preview':
    render('preview', 800, 800, 24)
    for v in ARGS[1:]: render('preview_' + v, 800, 600, 24, v)
elif MODE == 'final':
    render('hero', 1800, 1800, 256)
    render('rocks', 1600, 1200, 192, 'rocks')
    render('street', 1600, 1200, 192, 'street')
    export_glb()
elif MODE == 'export':
    export_glb()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'xiangshan.blend'))
log('saved blend')
