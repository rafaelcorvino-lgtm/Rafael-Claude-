"""
Mortar-Style Bottle Opener V4 — Faithful to the reference photo.

VISUAL (from photo):
- Narrow barrel tilted ~65° from horizontal (like a real mortar)
- Thin tripod legs spread wide
- Compact table-top size
- Military/tactical aesthetic
- Small sight on barrel

MECHANISM (user described):
- Bottle enters standing up into the muzzle (tilted barrel)
- Bottle slides/falls down the barrel by gravity
- Bottom of bottle hits inner lever arm
- Outer lever arm swings and pries cap off

The barrel is sized to fit a bottle NECK + CAP area (~30mm ID).
The bottle neck enters the barrel; the body stays outside.

Dimensions in mm, for 3D printing.
"""

import numpy as np
from stl import mesh
import math


# =============================================================
# PRIMITIVES
# =============================================================

def cyl(r, h, seg=48, z0=0, cx=0, cy=0):
    faces = []
    for i in range(seg):
        a1 = 2 * math.pi * i / seg
        a2 = 2 * math.pi * (i + 1) / seg
        x1, y1 = r * math.cos(a1) + cx, r * math.sin(a1) + cy
        x2, y2 = r * math.cos(a2) + cx, r * math.sin(a2) + cy
        faces.append([[cx, cy, z0], [x1, y1, z0], [x2, y2, z0]])
        faces.append([[cx, cy, z0+h], [x2, y2, z0+h], [x1, y1, z0+h]])
        faces.append([[x1, y1, z0], [x1, y1, z0+h], [x2, y2, z0]])
        faces.append([[x2, y2, z0], [x1, y1, z0+h], [x2, y2, z0+h]])
    return faces


def tube(ro, ri, h, seg=48, z0=0, cx=0, cy=0):
    faces = []
    for i in range(seg):
        a1 = 2 * math.pi * i / seg
        a2 = 2 * math.pi * (i + 1) / seg
        c1, s1 = math.cos(a1), math.sin(a1)
        c2, s2 = math.cos(a2), math.sin(a2)
        ox1, oy1 = ro*c1+cx, ro*s1+cy
        ox2, oy2 = ro*c2+cx, ro*s2+cy
        ix1, iy1 = ri*c1+cx, ri*s1+cy
        ix2, iy2 = ri*c2+cx, ri*s2+cy
        zb, zt = z0, z0+h
        faces.append([[ox1,oy1,zb],[ox1,oy1,zt],[ox2,oy2,zb]])
        faces.append([[ox2,oy2,zb],[ox1,oy1,zt],[ox2,oy2,zt]])
        faces.append([[ix1,iy1,zb],[ix2,iy2,zb],[ix1,iy1,zt]])
        faces.append([[ix2,iy2,zb],[ix2,iy2,zt],[ix1,iy1,zt]])
        faces.append([[ox1,oy1,zb],[ox2,oy2,zb],[ix1,iy1,zb]])
        faces.append([[ix1,iy1,zb],[ox2,oy2,zb],[ix2,iy2,zb]])
        faces.append([[ox1,oy1,zt],[ix1,iy1,zt],[ox2,oy2,zt]])
        faces.append([[ix2,iy2,zt],[ox2,oy2,zt],[ix1,iy1,zt]])
    return faces


def cone(rb, rt, h, seg=48, z0=0, cx=0, cy=0):
    faces = []
    for i in range(seg):
        a1 = 2 * math.pi * i / seg
        a2 = 2 * math.pi * (i + 1) / seg
        c1, s1 = math.cos(a1), math.sin(a1)
        c2, s2 = math.cos(a2), math.sin(a2)
        bx1, by1 = rb*c1+cx, rb*s1+cy
        bx2, by2 = rb*c2+cx, rb*s2+cy
        tx1, ty1 = rt*c1+cx, rt*s1+cy
        tx2, ty2 = rt*c2+cx, rt*s2+cy
        if rb > 0.1:
            faces.append([[cx,cy,z0],[bx1,by1,z0],[bx2,by2,z0]])
        if rt > 0.1:
            faces.append([[cx,cy,z0+h],[tx2,ty2,z0+h],[tx1,ty1,z0+h]])
        faces.append([[bx1,by1,z0],[tx1,ty1,z0+h],[bx2,by2,z0]])
        faces.append([[bx2,by2,z0],[tx1,ty1,z0+h],[tx2,ty2,z0+h]])
    return faces


def box(w, d, h, cx=0, cy=0, cz=0):
    hw, hd = w/2, d/2
    v = [
        [cx-hw,cy-hd,cz],[cx+hw,cy-hd,cz],[cx+hw,cy+hd,cz],[cx-hw,cy+hd,cz],
        [cx-hw,cy-hd,cz+h],[cx+hw,cy-hd,cz+h],[cx+hw,cy+hd,cz+h],[cx-hw,cy+hd,cz+h],
    ]
    return [
        [v[0],v[2],v[1]],[v[0],v[3],v[2]],
        [v[4],v[5],v[6]],[v[4],v[6],v[7]],
        [v[0],v[1],v[5]],[v[0],v[5],v[4]],
        [v[2],v[3],v[7]],[v[2],v[7],v[6]],
        [v[0],v[4],v[7]],[v[0],v[7],v[3]],
        [v[1],v[2],v[6]],[v[1],v[6],v[5]],
    ]


def tcyl(radius, length, seg, start, direction):
    """Tilted solid cylinder along a direction."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.0]) if abs(d[2]) < 0.9 else np.array([1,0,0.0])
    p1 = np.cross(d, up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d, p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s + d * length
    for i in range(seg):
        a1 = 2*math.pi*i/seg; a2 = 2*math.pi*(i+1)/seg
        o1 = radius*(math.cos(a1)*p1+math.sin(a1)*p2)
        o2 = radius*(math.cos(a2)*p1+math.sin(a2)*p2)
        b1=(s+o1).tolist(); b2=(s+o2).tolist()
        t1=(e+o1).tolist(); t2=(e+o2).tolist()
        faces.append([s.tolist(),b1,b2])
        faces.append([e.tolist(),t2,t1])
        faces.append([b1,t1,b2]); faces.append([b2,t1,t2])
    return faces


def ttube(ro, ri, length, seg, start, direction):
    """Tilted hollow tube along a direction."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.0]) if abs(d[2]) < 0.9 else np.array([1,0,0.0])
    p1 = np.cross(d, up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d, p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s + d * length
    for i in range(seg):
        a1 = 2*math.pi*i/seg; a2 = 2*math.pi*(i+1)/seg
        oo1 = ro*(math.cos(a1)*p1+math.sin(a1)*p2)
        oo2 = ro*(math.cos(a2)*p1+math.sin(a2)*p2)
        io1 = ri*(math.cos(a1)*p1+math.sin(a1)*p2)
        io2 = ri*(math.cos(a2)*p1+math.sin(a2)*p2)
        ob1=(s+oo1).tolist(); ob2=(s+oo2).tolist()
        ot1=(e+oo1).tolist(); ot2=(e+oo2).tolist()
        ib1=(s+io1).tolist(); ib2=(s+io2).tolist()
        it1=(e+io1).tolist(); it2=(e+io2).tolist()
        # outer
        faces.append([ob1,ot1,ob2]); faces.append([ob2,ot1,ot2])
        # inner
        faces.append([ib1,ib2,it1]); faces.append([ib2,it2,it1])
        # bottom ring
        faces.append([ob1,ob2,ib1]); faces.append([ib1,ob2,ib2])
        # top ring
        faces.append([ot1,it1,ot2]); faces.append([it2,ot2,it1])
    return faces


def tcone(rb, rt, length, seg, start, direction):
    """Tilted cone/frustum along a direction."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.0]) if abs(d[2]) < 0.9 else np.array([1,0,0.0])
    p1 = np.cross(d, up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d, p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s + d * length
    for i in range(seg):
        a1 = 2*math.pi*i/seg; a2 = 2*math.pi*(i+1)/seg
        bo1 = rb*(math.cos(a1)*p1+math.sin(a1)*p2)
        bo2 = rb*(math.cos(a2)*p1+math.sin(a2)*p2)
        to1 = rt*(math.cos(a1)*p1+math.sin(a1)*p2)
        to2 = rt*(math.cos(a2)*p1+math.sin(a2)*p2)
        b1=(s+bo1).tolist(); b2=(s+bo2).tolist()
        t1=(e+to1).tolist(); t2=(e+to2).tolist()
        if rb > 0.1:
            faces.append([s.tolist(),b1,b2])
        if rt > 0.1:
            faces.append([e.tolist(),t2,t1])
        faces.append([b1,t1,b2]); faces.append([b2,t1,t2])
    return faces


# =============================================================
# MAIN MODEL - Faithful to reference photo
# =============================================================

def generate():
    F = []
    seg = 48

    # =============================================
    # BARREL PARAMETERS (narrow, tilted like photo)
    # =============================================
    barrel_or = 14          # Outer radius (28mm OD - narrow like photo)
    barrel_ir = 11          # Inner radius (22mm ID)
    barrel_len = 140        # Barrel length
    barrel_tilt = 65        # Degrees from horizontal (like photo)

    tilt_rad = math.radians(barrel_tilt)
    # Barrel direction: tilted in YZ plane
    bdir = np.array([0, -math.cos(tilt_rad), math.sin(tilt_rad)])
    bdir /= np.linalg.norm(bdir)

    # =============================================
    # TRIPOD — thin legs, spread wide (like photo)
    # =============================================
    # The tripod hub sits where the barrel connects
    hub_z = 50
    hub_pos = np.array([0, 0, hub_z])

    # Hub collar (where barrel passes through) - 2 rings
    F.extend(tube(barrel_or + 8, barrel_or + 1, 12, seg,
                  z0=hub_z - 4))
    F.extend(tube(barrel_or + 10, barrel_or + 7, 4, seg,
                  z0=hub_z - 5))
    F.extend(tube(barrel_or + 10, barrel_or + 7, 4, seg,
                  z0=hub_z + 7))

    # Three thin legs — spread wide like the photo
    leg_r = 3.5
    leg_len = 90

    # Leg angles: front-left, front-right, back-center
    leg_angles = [
        math.radians(210),  # back-left
        math.radians(330),  # back-right
        math.radians(90),   # front (toward where bottle goes)
    ]

    for la in leg_angles:
        dx = math.cos(la)
        dy = math.sin(la)

        leg_start = np.array([dx * (barrel_or + 6),
                              dy * (barrel_or + 6),
                              hub_z - 3])
        leg_dir = np.array([dx * 0.75, dy * 0.75, -0.65])
        leg_dir /= np.linalg.norm(leg_dir)

        F.extend(tcyl(leg_r, leg_len, seg//2, leg_start.tolist(), leg_dir.tolist()))

        # Foot pad
        foot = leg_start + leg_dir * leg_len
        F.extend(cyl(8, 2.5, seg//2, z0=0, cx=foot[0], cy=foot[1]))

        # Cross-brace from mid-leg to hub (structural)
        mid = leg_start + leg_dir * (leg_len * 0.45)
        brace_start = np.array([dx * (barrel_or + 4),
                                dy * (barrel_or + 4),
                                hub_z + 5])
        brace_dir = mid - brace_start
        F.extend(tcyl(2, np.linalg.norm(brace_dir) * 0.7, seg//4,
                       brace_start.tolist(), brace_dir.tolist()))

    # =============================================
    # BARREL — narrow, tilted, hollow (like photo)
    # =============================================

    # Barrel starts at hub, goes up and slightly forward
    barrel_start = hub_pos + bdir * (-5)  # Slightly below hub

    # Main barrel tube
    F.extend(ttube(barrel_or, barrel_ir, barrel_len, seg,
                   barrel_start.tolist(), bdir.tolist()))

    # Barrel below hub (short extension downward)
    barrel_bottom = barrel_start - bdir * 20
    F.extend(ttube(barrel_or, barrel_ir, 20, seg,
                   barrel_bottom.tolist(), bdir.tolist()))

    # Bottom cap (closes the bottom of the barrel)
    F.extend(tcyl(barrel_ir, 3, seg, barrel_bottom.tolist(), bdir.tolist()))

    barrel_end = barrel_start + bdir * barrel_len

    # =============================================
    # MUZZLE FLARE (top of barrel — like photo)
    # =============================================
    F.extend(tcone(barrel_or, barrel_or + 5, 8, seg,
                   barrel_end.tolist(), bdir.tolist()))
    muzzle_top = barrel_end + bdir * 8
    F.extend(tcone(barrel_or + 5, barrel_or + 6, 3, seg,
                   muzzle_top.tolist(), bdir.tolist()))
    # Muzzle lip ring
    lip_pos = barrel_end + bdir * 11
    F.extend(ttube(barrel_or + 8, barrel_or + 5, 4, seg,
                   lip_pos.tolist(), bdir.tolist()))

    # =============================================
    # BARREL BANDS (decorative rings — like photo)
    # =============================================
    for frac in [0.2, 0.45, 0.7]:
        bp = barrel_start + bdir * (barrel_len * frac)
        F.extend(ttube(barrel_or + 2.5, barrel_or, 4, seg,
                       bp.tolist(), bdir.tolist()))

    # =============================================
    # SIGHT (small vertical fin on barrel — like photo)
    # =============================================
    # The sight sits on top of barrel, perpendicular
    sight_pos = barrel_start + bdir * (barrel_len * 0.82)
    # We need to find "up" relative to the barrel
    barrel_perp = np.array([0, math.sin(tilt_rad), math.cos(tilt_rad)])
    barrel_perp /= np.linalg.norm(barrel_perp)

    sight_base = sight_pos + barrel_perp * barrel_or
    sight_dir = barrel_perp.tolist()
    F.extend(tcyl(1.5, 18, seg//4, sight_base.tolist(), sight_dir))

    # Sight cross-bar at top
    sight_top = sight_base + np.array(sight_dir) * 18
    F.extend(tcyl(1, 8, seg//4, (sight_top - bdir * 4).tolist(), bdir.tolist()))

    # =============================================
    # LEVER MECHANISM
    #
    # Integrated into the tilted barrel. The lever pivots
    # on a pin through the barrel wall near the bottom.
    #
    # INNER ARM: extends along barrel interior (bottle
    #   neck/bottom slides down and hits it)
    # OUTER ARM: extends along barrel exterior upward,
    #   with a hook that catches under the bottle cap
    #
    # The lever is on the "uphill" side of the tilted barrel
    # (the side facing up, so gravity helps)
    # =============================================

    # Perpendicular "up" from barrel surface
    up_from_barrel = barrel_perp

    # Fulcrum position: near bottom of barrel, on the upper surface
    fulcrum_along = 25  # mm from barrel start along barrel axis
    fulcrum_pos = barrel_start + bdir * fulcrum_along

    # Fulcrum is on the barrel wall (upper side)
    fulcrum_surface = fulcrum_pos + up_from_barrel * barrel_or

    # Pivot pin (through the barrel wall)
    pin_perp = np.cross(bdir, up_from_barrel)
    pin_perp /= np.linalg.norm(pin_perp)
    pin_start = fulcrum_surface - pin_perp * 12
    F.extend(tcyl(2.5, 24, seg//3, pin_start.tolist(), pin_perp.tolist()))

    # Fulcrum brackets (two plates on barrel exterior)
    for side in [-1, 1]:
        bracket_pos = fulcrum_surface + pin_perp * side * 10
        # Small block on barrel surface
        F.extend(tcyl(4, 10, seg//4, bracket_pos.tolist(),
                       up_from_barrel.tolist()))

    # INNER ARM — extends down inside the barrel
    # (along -bdir from fulcrum, inside the barrel)
    inner_arm_start = fulcrum_pos + up_from_barrel * (barrel_ir - 3)
    inner_arm_dir = (-bdir).tolist()
    inner_arm_len = 35
    # Rectangular lever arm approximated as flat cylinder
    F.extend(tcyl(4, inner_arm_len, seg//3,
                  inner_arm_start.tolist(), inner_arm_dir))

    # Paddle at end of inner arm (where bottle hits)
    paddle_pos = inner_arm_start - bdir * inner_arm_len
    F.extend(tcyl(8, 3, seg//2, paddle_pos.tolist(),
                  up_from_barrel.tolist()))

    # OUTER ARM — extends up along barrel exterior toward muzzle
    outer_arm_start = fulcrum_surface + up_from_barrel * 3
    outer_arm_dir = bdir.tolist()  # Along barrel toward muzzle
    outer_arm_len = 120

    # Main outer arm bar
    F.extend(tcyl(3.5, outer_arm_len, seg//3,
                  outer_arm_start.tolist(), outer_arm_dir))

    # Hook at the end of outer arm
    hook_base = np.array(outer_arm_start) + bdir * outer_arm_len

    # Hook curves inward (toward barrel center / bottle)
    hook_down_dir = (-up_from_barrel).tolist()
    F.extend(tcyl(3.5, 20, seg//3, hook_base.tolist(), hook_down_dir))

    # Hook lip (catches under the cap)
    hook_tip = hook_base - up_from_barrel * 20
    hook_lip_dir = (-bdir).tolist()  # Points back along barrel
    F.extend(tcyl(3, 12, seg//3, hook_tip.tolist(), hook_lip_dir))

    # Small tooth on hook lip for grabbing cap edge
    tooth_pos = hook_tip - bdir * 12
    F.extend(tcyl(2, 5, seg//4, tooth_pos.tolist(), hook_down_dir))

    # =============================================
    # CONVERT TO STL
    # =============================================
    fa = np.array(F)
    m = mesh.Mesh(np.zeros(len(fa), dtype=mesh.Mesh.dtype))
    for i, face in enumerate(fa):
        for j in range(3):
            m.vectors[i][j] = face[j]
    m.update_normals()
    return m


if __name__ == "__main__":
    print("=" * 60)
    print("  MORTAR BOTTLE OPENER V4 — Photo-faithful design")
    print("=" * 60)
    print()

    m = generate()
    out = "mortar_bottle_opener.stl"
    m.save(out)

    dx = m.x.max() - m.x.min()
    dy = m.y.max() - m.y.min()
    dz = m.z.max() - m.z.min()

    print(f"File: {out}")
    print(f"Faces: {len(m.vectors)}")
    print(f"Size:  {dx:.1f} x {dy:.1f} x {dz:.1f} mm")
    print()
    print("DESIGN (matching reference photo):")
    print("  - Narrow barrel (28mm OD) tilted at 65 degrees")
    print("  - Thin tripod legs spread wide")
    print("  - Muzzle flare with lip ring at top")
    print("  - Barrel bands (3 decorative rings)")
    print("  - Sight on barrel (fin + crossbar)")
    print("  - Lever mechanism with pivot pin")
    print()
    print("MECHANISM:")
    print("  1. Bottle enters standing in the muzzle (neck first)")
    print("  2. Slides down the tilted barrel by gravity")
    print("  3. Bottle bottom hits inner lever paddle")
    print("  4. Outer arm swings up, hook catches cap")
    print("  5. Cap pried off!")
    print()
    print("PRINT: PETG/ABS, 0.2mm layers, 60%+ infill, supports ON")
