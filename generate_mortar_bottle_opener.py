"""
Mortar Bottle Opener V6 — Based on detailed reference photos.

FROM THE PHOTOS:
- Wide barrel (fits full beer bottle ~65mm body) - olive green
- Barrel tilted ~63 degrees from horizontal
- Large SIDE OPENING at the bottom of the barrel to remove bottle
- Rectangular BASE PLATE at the bottom housing the opener mechanism
- 3 thin legs from base plate to ground (black in original)
- Flared muzzle at top with thick lip ring
- Barrel bands / markings
- Bottle enters STANDING UP (cap on top), falls by gravity
- Mechanism at base catches the cap and pries it off

Dimensions in mm for 3D printing.
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
        a1, a2 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        x1, y1 = r*math.cos(a1)+cx, r*math.sin(a1)+cy
        x2, y2 = r*math.cos(a2)+cx, r*math.sin(a2)+cy
        faces += [[[cx,cy,z0],[x1,y1,z0],[x2,y2,z0]],
                  [[cx,cy,z0+h],[x2,y2,z0+h],[x1,y1,z0+h]],
                  [[x1,y1,z0],[x1,y1,z0+h],[x2,y2,z0]],
                  [[x2,y2,z0],[x1,y1,z0+h],[x2,y2,z0+h]]]
    return faces


def tube(ro, ri, h, seg=48, z0=0, cx=0, cy=0):
    faces = []
    for i in range(seg):
        a1, a2 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        c1, s1, c2, s2 = math.cos(a1), math.sin(a1), math.cos(a2), math.sin(a2)
        ox1,oy1 = ro*c1+cx, ro*s1+cy; ox2,oy2 = ro*c2+cx, ro*s2+cy
        ix1,iy1 = ri*c1+cx, ri*s1+cy; ix2,iy2 = ri*c2+cx, ri*s2+cy
        zb, zt = z0, z0+h
        faces += [[[ox1,oy1,zb],[ox1,oy1,zt],[ox2,oy2,zb]],
                  [[ox2,oy2,zb],[ox1,oy1,zt],[ox2,oy2,zt]],
                  [[ix1,iy1,zb],[ix2,iy2,zb],[ix1,iy1,zt]],
                  [[ix2,iy2,zb],[ix2,iy2,zt],[ix1,iy1,zt]],
                  [[ox1,oy1,zb],[ox2,oy2,zb],[ix1,iy1,zb]],
                  [[ix1,iy1,zb],[ox2,oy2,zb],[ix2,iy2,zb]],
                  [[ox1,oy1,zt],[ix1,iy1,zt],[ox2,oy2,zt]],
                  [[ix2,iy2,zt],[ox2,oy2,zt],[ix1,iy1,zt]]]
    return faces


def box(w, d, h, cx=0, cy=0, cz=0):
    hw, hd = w/2, d/2
    v = [[cx-hw,cy-hd,cz],[cx+hw,cy-hd,cz],[cx+hw,cy+hd,cz],[cx-hw,cy+hd,cz],
         [cx-hw,cy-hd,cz+h],[cx+hw,cy-hd,cz+h],[cx+hw,cy+hd,cz+h],[cx-hw,cy+hd,cz+h]]
    return [[v[0],v[2],v[1]],[v[0],v[3],v[2]],[v[4],v[5],v[6]],[v[4],v[6],v[7]],
            [v[0],v[1],v[5]],[v[0],v[5],v[4]],[v[2],v[3],v[7]],[v[2],v[7],v[6]],
            [v[0],v[4],v[7]],[v[0],v[7],v[3]],[v[1],v[2],v[6]],[v[1],v[6],v[5]]]


def tcyl(r, length, seg, start, direction):
    """Tilted solid cylinder."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.]) if abs(d[2])<0.9 else np.array([1,0,0.])
    p1 = np.cross(d,up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d,p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s+d*length
    for i in range(seg):
        a1, a2 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        o1 = r*(math.cos(a1)*p1+math.sin(a1)*p2)
        o2 = r*(math.cos(a2)*p1+math.sin(a2)*p2)
        b1,b2 = (s+o1).tolist(),(s+o2).tolist()
        t1,t2 = (e+o1).tolist(),(e+o2).tolist()
        faces += [[s.tolist(),b1,b2],[e.tolist(),t2,t1],[b1,t1,b2],[b2,t1,t2]]
    return faces


def ttube(ro, ri, length, seg, start, direction):
    """Tilted hollow tube."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.]) if abs(d[2])<0.9 else np.array([1,0,0.])
    p1 = np.cross(d,up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d,p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s+d*length
    for i in range(seg):
        a1, a2 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        oo1=ro*(math.cos(a1)*p1+math.sin(a1)*p2); oo2=ro*(math.cos(a2)*p1+math.sin(a2)*p2)
        io1=ri*(math.cos(a1)*p1+math.sin(a1)*p2); io2=ri*(math.cos(a2)*p1+math.sin(a2)*p2)
        ob1,ob2=(s+oo1).tolist(),(s+oo2).tolist()
        ot1,ot2=(e+oo1).tolist(),(e+oo2).tolist()
        ib1,ib2=(s+io1).tolist(),(s+io2).tolist()
        it1,it2=(e+io1).tolist(),(e+io2).tolist()
        faces += [[ob1,ot1,ob2],[ob2,ot1,ot2],
                  [ib1,ib2,it1],[ib2,it2,it1],
                  [ob1,ob2,ib1],[ib1,ob2,ib2],
                  [ot1,it1,ot2],[it2,ot2,it1]]
    return faces


def tcone(rb, rt, length, seg, start, direction):
    """Tilted cone/frustum."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.]) if abs(d[2])<0.9 else np.array([1,0,0.])
    p1 = np.cross(d,up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d,p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s+d*length
    for i in range(seg):
        a1, a2 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        bo1=rb*(math.cos(a1)*p1+math.sin(a1)*p2); bo2=rb*(math.cos(a2)*p1+math.sin(a2)*p2)
        to1=rt*(math.cos(a1)*p1+math.sin(a1)*p2); to2=rt*(math.cos(a2)*p1+math.sin(a2)*p2)
        b1,b2=(s+bo1).tolist(),(s+bo2).tolist()
        t1,t2=(e+to1).tolist(),(e+to2).tolist()
        if rb>0.1: faces.append([s.tolist(),b1,b2])
        if rt>0.1: faces.append([e.tolist(),t2,t1])
        faces += [[b1,t1,b2],[b2,t1,t2]]
    return faces


def partial_ttube(ro, ri, length, seg, start, direction, open_start, open_end):
    """Tilted hollow tube with angular opening. Skips faces in [open_start, open_end]."""
    faces = []
    d = np.array(direction, dtype=float); d /= np.linalg.norm(d)
    up = np.array([0,0,1.]) if abs(d[2])<0.9 else np.array([1,0,0.])
    p1 = np.cross(d,up); p1 /= np.linalg.norm(p1)
    p2 = np.cross(d,p1); p2 /= np.linalg.norm(p2)
    s = np.array(start, dtype=float); e = s+d*length

    def in_open(a):
        a = a % (2*math.pi)
        os = open_start % (2*math.pi)
        oe = open_end % (2*math.pi)
        return (a >= os and a <= oe) if os < oe else (a >= os or a <= oe)

    for i in range(seg):
        a1, a2 = 2*math.pi*i/seg, 2*math.pi*(i+1)/seg
        if in_open(a1) and in_open(a2):
            continue
        oo1=ro*(math.cos(a1)*p1+math.sin(a1)*p2); oo2=ro*(math.cos(a2)*p1+math.sin(a2)*p2)
        io1=ri*(math.cos(a1)*p1+math.sin(a1)*p2); io2=ri*(math.cos(a2)*p1+math.sin(a2)*p2)
        ob1,ob2=(s+oo1).tolist(),(s+oo2).tolist()
        ot1,ot2=(e+oo1).tolist(),(e+oo2).tolist()
        ib1,ib2=(s+io1).tolist(),(s+io2).tolist()
        it1,it2=(e+io1).tolist(),(e+io2).tolist()
        faces += [[ob1,ot1,ob2],[ob2,ot1,ot2],
                  [ib1,ib2,it1],[ib2,it2,it1],
                  [ob1,ob2,ib1],[ib1,ob2,ib2],
                  [ot1,it1,ot2],[it2,ot2,it1]]

    # Seal cut edges
    for ea in [open_start, open_end]:
        oo=ro*(math.cos(ea)*p1+math.sin(ea)*p2)
        io=ri*(math.cos(ea)*p1+math.sin(ea)*p2)
        ob,ot=(s+oo).tolist(),(e+oo).tolist()
        ib,it_=(s+io).tolist(),(e+io).tolist()
        faces += [[ob,ot,ib],[ib,ot,it_]]
    return faces


# =============================================================
# MAIN MODEL
# =============================================================

def generate():
    F = []
    seg = 48

    # =============================================
    # DIMENSIONS from photos
    # =============================================
    barrel_or = 38          # Outer radius (~76mm OD — fits 65mm bottle + wall)
    barrel_ir = 34          # Inner radius (~68mm ID — 65mm bottle + clearance)
    barrel_wall = 4         # Wall thickness
    barrel_len = 200        # Long barrel (bottle drops deep inside)
    barrel_tilt = 63        # Degrees from horizontal

    tilt_rad = math.radians(barrel_tilt)
    bdir = np.array([0, -math.cos(tilt_rad), math.sin(tilt_rad)])
    bdir /= np.linalg.norm(bdir)

    # Perpendicular vectors relative to barrel
    # "up" from barrel surface (points away from ground side)
    barrel_up = np.array([0, math.sin(tilt_rad), math.cos(tilt_rad)])
    barrel_up /= np.linalg.norm(barrel_up)
    # "side" perpendicular
    barrel_side = np.cross(bdir, barrel_up)
    barrel_side /= np.linalg.norm(barrel_side)

    # =============================================
    # BASE PLATE — rectangular plate at bottom
    # (houses the opener mechanism, like in the photos)
    # =============================================
    # The base plate sits at the bottom of the barrel
    # It's a thick rectangular block, slightly wider than the barrel

    base_z = 8  # Base plate sits slightly above ground
    base_width = 90   # X dimension
    base_depth = 90   # Y dimension
    base_height = 25  # Thickness

    # Position: centered under where the barrel bottom meets
    barrel_base_y = -math.cos(tilt_rad) * 15  # barrel bottom Y offset
    F.extend(box(base_width, base_depth, base_height,
                 cx=0, cy=barrel_base_y, cz=base_z))

    # Rounded top edges on base (beveled look)
    F.extend(box(base_width - 8, base_depth - 8, 4,
                 cx=0, cy=barrel_base_y, cz=base_z + base_height))

    # Bottle cap exit channel in base plate (curved channel)
    # The cap falls through here after being removed
    F.extend(cyl(15, base_height + 4, seg//2, z0=base_z,
                 cx=0, cy=barrel_base_y))

    # =============================================
    # TRIPOD LEGS — thin, from base plate to ground
    # (3 legs like in the photos, spreading outward)
    # =============================================
    leg_r = 4.5
    leg_len = 70

    # From photos: 2 front legs + 1 back leg
    leg_configs = [
        (math.radians(200), 0.8, -0.5),   # back-left
        (math.radians(340), 0.8, -0.5),   # back-right
        (math.radians(90),  0.6, -0.7),   # front (under barrel)
    ]

    for la, spread, drop in leg_configs:
        dx = math.cos(la)
        dy = math.sin(la)

        leg_start = np.array([dx * 35 + 0,
                              dy * 35 + barrel_base_y,
                              base_z + 5])
        leg_dir = np.array([dx * spread, dy * spread, drop])
        leg_dir /= np.linalg.norm(leg_dir)

        F.extend(tcyl(leg_r, leg_len, seg//2,
                       leg_start.tolist(), leg_dir.tolist()))

        # Foot pad (flat round foot at ground level)
        foot = leg_start + leg_dir * leg_len
        F.extend(cyl(10, 3, seg//2, z0=0, cx=foot[0], cy=foot[1]))

        # Collar where leg meets base (thicker joint)
        F.extend(tcyl(leg_r + 2, 10, seg//3,
                       leg_start.tolist(), leg_dir.tolist()))

    # =============================================
    # BARREL BOTTOM SECTION (closed, connects to base)
    # =============================================
    # The barrel starts just above the base plate
    hub_z = base_z + base_height + 3
    barrel_start = np.array([0, barrel_base_y, hub_z])

    # Connection collar: barrel to base plate
    # Thick ring where barrel meets the base
    F.extend(tcone(barrel_or + 8, barrel_or + 2, 12, seg,
                   (barrel_start - bdir * 2).tolist(), bdir.tolist()))

    # Bottom cap (closes barrel bottom — mechanism is in base plate below)
    F.extend(tcyl(barrel_ir, 3, seg,
                  (barrel_start - bdir * 2).tolist(), bdir.tolist()))

    # =============================================
    # BARREL — with SIDE OPENING at bottom section
    #
    # From photos: large opening on one side, near the
    # bottom, so you can see/grab the bottle after it drops.
    # The opening faces FORWARD (toward the user).
    # =============================================

    # Opening parameters (in barrel's local frame)
    # The opening is on the side that faces "forward" when the
    # mortar is set up. Since barrel_side = X direction in local frame,
    # and the opening in the photos faces the user:
    open_start_angle = math.radians(-70)   # 140 degree opening
    open_end_angle = math.radians(70)

    # Section 1: Bottom with opening (where bottle ends up)
    sec1_len = 100  # Bottom 100mm has the opening
    F.extend(partial_ttube(barrel_or, barrel_ir, sec1_len, seg,
                           barrel_start.tolist(), bdir.tolist(),
                           open_start_angle, open_end_angle))

    # Section 2: Top closed section (bottle passes through here)
    sec2_start = barrel_start + bdir * sec1_len
    sec2_len = barrel_len - sec1_len  # Remaining 100mm
    F.extend(ttube(barrel_or, barrel_ir, sec2_len, seg,
                   sec2_start.tolist(), bdir.tolist()))

    barrel_end = barrel_start + bdir * barrel_len

    # =============================================
    # OPENING FRAME — reinforcement ribs
    # =============================================
    d_n = bdir / np.linalg.norm(bdir)
    up_ref = np.array([0,0,1.]) if abs(d_n[2])<0.9 else np.array([1,0,0.])
    lp1 = np.cross(d_n, up_ref); lp1 /= np.linalg.norm(lp1)
    lp2 = np.cross(d_n, lp1); lp2 /= np.linalg.norm(lp2)

    frame_r = 3.5

    # Vertical edge bars
    for angle in [open_start_angle, open_end_angle]:
        offset = (barrel_or + 1) * (math.cos(angle)*lp1 + math.sin(angle)*lp2)
        fs = barrel_start + offset
        F.extend(tcyl(frame_r, sec1_len, seg//4,
                       fs.tolist(), bdir.tolist()))

    # Horizontal bar at top of opening
    e1 = (barrel_or+1)*(math.cos(open_start_angle)*lp1+math.sin(open_start_angle)*lp2)
    e2 = (barrel_or+1)*(math.cos(open_end_angle)*lp1+math.sin(open_end_angle)*lp2)
    bar_s = barrel_start + bdir*sec1_len + e1
    bar_d = e2 - e1
    F.extend(tcyl(frame_r, np.linalg.norm(bar_d), seg//4,
                  bar_s.tolist(), bar_d.tolist()))

    # Horizontal bar at bottom of opening
    bar_s2 = barrel_start + e1
    F.extend(tcyl(frame_r, np.linalg.norm(bar_d), seg//4,
                  bar_s2.tolist(), bar_d.tolist()))

    # =============================================
    # MUZZLE FLARE (top of barrel)
    # Wide flared opening with thick lip — like in photos
    # =============================================
    # Gradual flare
    F.extend(tcone(barrel_or, barrel_or + 4, 8, seg,
                   barrel_end.tolist(), bdir.tolist()))
    flare1 = barrel_end + bdir * 8
    F.extend(tcone(barrel_or + 4, barrel_or + 8, 6, seg,
                   flare1.tolist(), bdir.tolist()))
    # Thick lip ring at very top
    flare2 = barrel_end + bdir * 14
    F.extend(ttube(barrel_or + 10, barrel_or + 6, 5, seg,
                   flare2.tolist(), bdir.tolist()))
    # Inner lip (slight inward lip like in photos)
    F.extend(ttube(barrel_or + 7, barrel_ir, 3, seg,
                   flare2.tolist(), bdir.tolist()))

    # =============================================
    # BARREL BANDS (decorative rings)
    # From photo: visible raised bands along barrel
    # =============================================
    for frac in [0.35, 0.55, 0.75]:
        bp = barrel_start + bdir * (barrel_len * frac)
        F.extend(ttube(barrel_or + 3, barrel_or, 5, seg,
                       bp.tolist(), bdir.tolist()))

    # =============================================
    # BARREL MARKINGS — raised details
    # "V" chevron near top (visible in photo 1)
    # =============================================
    # V-mark position: ~85% up the barrel, on the upper surface
    vmark_pos = barrel_start + bdir * (barrel_len * 0.85)
    vmark_surface = vmark_pos - barrel_up * (barrel_or + 1)

    # Left arm of V
    v_left_dir = (-bdir * 0.5 + barrel_side * 0.3)
    v_left_dir /= np.linalg.norm(v_left_dir)
    F.extend(tcyl(1.5, 15, seg//4,
                  vmark_surface.tolist(), v_left_dir.tolist()))
    # Right arm of V
    v_right_dir = (-bdir * 0.5 - barrel_side * 0.3)
    v_right_dir /= np.linalg.norm(v_right_dir)
    F.extend(tcyl(1.5, 15, seg//4,
                  vmark_surface.tolist(), v_right_dir.tolist()))

    # =============================================
    # SIGHT — small fin on top of barrel (visible in photo 1)
    # =============================================
    sight_pos = barrel_start + bdir * (barrel_len * 0.7)
    sight_base = sight_pos - barrel_up * barrel_or
    F.extend(tcyl(1.5, 20, seg//4,
                  sight_base.tolist(), (-barrel_up).tolist()))
    # Crossbar
    sight_top = sight_base - barrel_up * 20
    F.extend(tcyl(1, 10, seg//4,
                  (sight_top - barrel_side*5).tolist(), barrel_side.tolist()))

    # =============================================
    # LEVER MECHANISM (inside base plate / barrel bottom)
    #
    # The opener mechanism sits at the barrel bottom/base plate
    # junction. When the bottle drops and lands at the bottom:
    # - A lever arm inside is pushed by the bottle weight
    # - The other end of the lever catches under the cap
    # - The cap is pried off
    #
    # From the photos, the mechanism is mostly hidden inside
    # the base plate. We model the visible parts.
    # =============================================

    # Lever pivot point (inside barrel, near bottom)
    pivot_pos = barrel_start + bdir * 10
    pivot_surface = pivot_pos + barrel_side * barrel_or

    # Pivot pin
    pin_start = pivot_surface - barrel_side * 5
    F.extend(tcyl(3, barrel_or * 1.5, seg//3,
                  (pivot_pos - barrel_side * barrel_ir * 0.7).tolist(),
                  barrel_side.tolist()))

    # Inner arm (paddle — bottle bottom lands on this)
    inner_start = pivot_pos
    F.extend(tcyl(5, 45, seg//3,
                  inner_start.tolist(), bdir.tolist()))

    # Paddle (wide flat area)
    paddle_pos = inner_start + bdir * 45
    F.extend(tcyl(15, 4, seg//2,
                  paddle_pos.tolist(), barrel_up.tolist()))

    # Outer arm (goes down through base, hook catches cap)
    outer_start = pivot_pos - barrel_up * 5
    outer_dir = -bdir  # Goes toward bottom
    F.extend(tcyl(4, 30, seg//3,
                  outer_start.tolist(), outer_dir.tolist()))

    # Hook at end of outer arm
    hook_pos = outer_start + outer_dir * 30
    # Hook curves up to catch cap
    F.extend(tcyl(3, 15, seg//3,
                  hook_pos.tolist(), (-barrel_up).tolist()))
    hook_tip = hook_pos - barrel_up * 15
    F.extend(tcyl(3, 10, seg//3,
                  hook_tip.tolist(), bdir.tolist()))

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
    print("  MORTAR BOTTLE OPENER V6 — Photo-faithful + Side Opening")
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
    print("FROM REFERENCE PHOTOS:")
    print("  - Wide barrel (76mm OD / 68mm ID) — fits full beer bottle")
    print("  - Tilted 63 degrees (matching photos)")
    print("  - Large 140-degree side opening at bottom for bottle removal")
    print("  - Rectangular base plate with mechanism housing")
    print("  - 3 thin legs with round foot pads")
    print("  - Flared muzzle with thick lip ring")
    print("  - 3 decorative barrel bands")
    print("  - V chevron marking near muzzle top")
    print("  - Sight fin with crossbar")
    print("  - Lever mechanism (pivot + paddle + hook)")
    print()
    print("MECHANISM:")
    print("  1. Bottle drops in STANDING UP (cap on top)")
    print("  2. Slides down tilted barrel by gravity")
    print("  3. Bottle bottom hits lever paddle inside barrel")
    print("  4. Lever pivots — hook catches under bottle cap")
    print("  5. Cap pried off!")
    print("  6. Remove bottle through SIDE OPENING")
    print()
    print("PRINT: PETG/ABS, 0.2mm layers, 60%+ infill, supports ON")
