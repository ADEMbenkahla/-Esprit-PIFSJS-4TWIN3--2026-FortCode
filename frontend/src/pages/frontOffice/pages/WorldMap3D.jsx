import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { missionsApi } from "../../../services/api";
import { useNavigate } from "react-router-dom";
import { Castle, Cpu, Lock, Shield, Sword, Trophy } from "lucide-react";

export default function WorldMap3D() {
  const LABEL_ICON_SIZE = 18;
  const mountRef = useRef(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [threeError, setThreeError] = useState(null);
  const [hoveredStageTitle, setHoveredStageTitle] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [labelPositions, setLabelPositions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await missionsApi.me();
        if (!cancelled) setStages(data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || error) return;
    if (!mountRef.current) return;

    setThreeError(null);

    let rafId = null;
    let disposed = false;

    let renderer;

    const getSize = () => {
      const el = mountRef.current;
      const w = el?.clientWidth || window.innerWidth;
      const h = el?.clientHeight || window.innerHeight;
      return {
        width: Math.max(1, w),
        height: Math.max(1, h),
      };
    };

    try {
      const { width, height } = getSize();

      // Size tuning (taille)
      const CASTLE_SCALE = 1.15;
      const ROAD_RADIUS = 2.4;
      const ROAD_TUBULAR_SEGMENTS = 260;
      const GLOW_RADIUS = 0.65;
      const MARKER_RADIUS = 1.6;
      const MARKER_HEIGHT = 3.3;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050611);
      scene.fog = new THREE.Fog(0x050611, 42, 170);

      // Camera
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
      camera.position.set(0, 26, 58);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);
      mountRef.current.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 24;
      controls.maxDistance = 90;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.target.set(0, 6, 0);
      controls.update();

      // Lighting
      const hemi = new THREE.HemisphereLight(0xa8d8ff, 0x101020, 0.9);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 1.15);
      dir.position.set(30, 45, 20);
      scene.add(dir);
      const rim = new THREE.DirectionalLight(0x60a5fa, 0.35);
      rim.position.set(-40, 20, -30);
      scene.add(rim);

      const magic = new THREE.PointLight(0xa78bfa, 1.65, 160, 2.0);
      magic.position.set(0, 18, 0);
      scene.add(magic);

      const warm = new THREE.PointLight(0xf59e0b, 0.85, 120, 2.2);
      warm.position.set(14, 8, 18);
      scene.add(warm);

      // Smaller centered terrain (progression island)
      const groundGeometry = new THREE.CircleGeometry(85, 64);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x06101d,
        roughness: 0.98,
        metalness: 0.06,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      scene.add(ground);

      // Zone tints (Village -> Forest -> Castle)
      const zoneGeo = new THREE.CircleGeometry(32, 48);
      const villageMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.98, metalness: 0.05 });
      const forestMat = new THREE.MeshStandardMaterial({ color: 0x0f2a1c, roughness: 0.98, metalness: 0.04 });
      const castleMat = new THREE.MeshStandardMaterial({ color: 0x243047, roughness: 0.98, metalness: 0.05 });

      const villageZone = new THREE.Mesh(zoneGeo, villageMat);
      villageZone.rotation.x = -Math.PI / 2;
      villageZone.position.set(-52, 0.02, 0);
      scene.add(villageZone);

      const forestZone = new THREE.Mesh(zoneGeo, forestMat);
      forestZone.rotation.x = -Math.PI / 2;
      forestZone.position.set(0, 0.02, 0);
      scene.add(forestZone);

      const castleZone = new THREE.Mesh(zoneGeo, castleMat);
      castleZone.rotation.x = -Math.PI / 2;
      castleZone.position.set(52, 0.02, 0);
      scene.add(castleZone);

      // Subtle boundary glow
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(82, 86, 96),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.18 })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.03;
      scene.add(glowRing);

      // Castle (stylized)
      const stone = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9, metalness: 0.05 });
      const stoneDark = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.95, metalness: 0.05 });
      const roof = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.78, metalness: 0.15 });

      const castleGroup = new THREE.Group();
      castleGroup.position.set(56, 0, 0);
      scene.add(castleGroup);

      const keep = new THREE.Mesh(new THREE.BoxGeometry(16 * CASTLE_SCALE, 14 * CASTLE_SCALE, 16 * CASTLE_SCALE), stone);
      keep.position.set(0, 7, 0);
      castleGroup.add(keep);

      const wallN = new THREE.Mesh(new THREE.BoxGeometry(26 * CASTLE_SCALE, 6 * CASTLE_SCALE, 4 * CASTLE_SCALE), stoneDark);
      wallN.position.set(0, 3, -14);
      castleGroup.add(wallN);
      const wallS = wallN.clone();
      wallS.position.set(0, 3, 14);
      castleGroup.add(wallS);
      const wallE = new THREE.Mesh(new THREE.BoxGeometry(4 * CASTLE_SCALE, 6 * CASTLE_SCALE, 26 * CASTLE_SCALE), stoneDark);
      wallE.position.set(14, 3, 0);
      castleGroup.add(wallE);
      const wallW = wallE.clone();
      wallW.position.set(-14, 3, 0);
      castleGroup.add(wallW);

      const towerGeo = new THREE.CylinderGeometry(3.0 * CASTLE_SCALE, 3.3 * CASTLE_SCALE, 11 * CASTLE_SCALE, 10);
      const capGeo = new THREE.ConeGeometry(3.3 * CASTLE_SCALE, 4.8 * CASTLE_SCALE, 10);
      const towers = [
        { x: 14, z: 14 },
        { x: 14, z: -14 },
        { x: -14, z: 14 },
        { x: -14, z: -14 },
      ];
      for (const t of towers) {
        const tw = new THREE.Mesh(towerGeo, stone);
        tw.position.set(t.x, 5.5, t.z);
        castleGroup.add(tw);
        const cap = new THREE.Mesh(capGeo, roof);
        cap.position.set(t.x, 12.8, t.z);
        castleGroup.add(cap);
      }

      // Village props (simple houses)
      const houseMat = new THREE.MeshStandardMaterial({ color: 0xd6c2a6, roughness: 0.95, metalness: 0.02 });
      const houseRoofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9, metalness: 0.04 });
      const houseBodyGeo = new THREE.BoxGeometry(3.6, 2.6, 3.6);
      const houseRoofGeo = new THREE.ConeGeometry(2.9, 2.3, 4);
      const housePositions = [
        new THREE.Vector3(-60, 1.3, -10),
        new THREE.Vector3(-52, 1.3, -4),
        new THREE.Vector3(-58, 1.3, 6),
        new THREE.Vector3(-48, 1.3, 10),
      ];
      const houseBodies = new THREE.InstancedMesh(houseBodyGeo, houseMat, housePositions.length);
      const houseRoofs = new THREE.InstancedMesh(houseRoofGeo, houseRoofMat, housePositions.length);
      const hTmp = new THREE.Object3D();
      for (let i = 0; i < housePositions.length; i++) {
        const p = housePositions[i];
        hTmp.position.copy(p);
        hTmp.rotation.y = (i * Math.PI) / 6;
        hTmp.updateMatrix();
        houseBodies.setMatrixAt(i, hTmp.matrix);
        hTmp.position.set(p.x, p.y + 2.35, p.z);
        hTmp.rotation.y = (i * Math.PI) / 6;
        hTmp.rotation.x = 0;
        hTmp.rotation.z = 0;
        hTmp.updateMatrix();
        houseRoofs.setMatrixAt(i, hTmp.matrix);
      }
      houseRoofs.rotation.y = Math.PI / 4;
      houseRoofs.position.y = 0.1;
      scene.add(houseBodies);
      scene.add(houseRoofs);

      // Forest props (low-poly trees)
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.6, 6);
      const leavesGeo = new THREE.ConeGeometry(1.25, 3.2, 7);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.95, metalness: 0.02 });
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.95, metalness: 0.02 });
      const treeCount = 26;
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
      const leaves = new THREE.InstancedMesh(leavesGeo, leavesMat, treeCount);
      const tTmp = new THREE.Object3D();
      for (let i = 0; i < treeCount; i++) {
        const a = (i / treeCount) * Math.PI * 2;
        const r = 14 + (i % 7) * 2.2;
        const x = Math.cos(a) * r * 0.9;
        const z = Math.sin(a) * r * 0.7;
        tTmp.position.set(x, 1.3, z);
        tTmp.rotation.y = a;
        tTmp.updateMatrix();
        trunks.setMatrixAt(i, tTmp.matrix);
        tTmp.position.set(x, 3.5, z);
        tTmp.rotation.y = a;
        tTmp.updateMatrix();
        leaves.setMatrixAt(i, tTmp.matrix);
      }
      scene.add(trunks);
      scene.add(leaves);

      // Build a winding "chemin" (road) curve through stages
      const markerGeo = new THREE.CylinderGeometry(MARKER_RADIUS, MARKER_RADIUS, MARKER_HEIGHT, 12);
      const markerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.1,
        emissive: new THREE.Color(0x0b1220),
        emissiveIntensity: 0.9,
        vertexColors: true,
      });

      const orderedStages = [...stages].sort((a, b) => (Number(a.order ?? 0) || 0) - (Number(b.order ?? 0) || 0));
      const count = orderedStages.length;

      // Curved road from Village (left) -> Forest (middle) -> Castle (right)
      const baseRoadPoints = [
        new THREE.Vector3(-62, 0.35, -12),
        new THREE.Vector3(-46, 0.35, 10),
        new THREE.Vector3(-18, 0.35, 14),
        new THREE.Vector3(0, 0.35, -8),
        new THREE.Vector3(22, 0.35, 8),
        new THREE.Vector3(44, 0.35, -4),
        new THREE.Vector3(62, 0.35, 2),
      ];
      const roadCurve = new THREE.CatmullRomCurve3(baseRoadPoints, false, "catmullrom", 0.6);

      // Road mesh (stone path) + glow trail (magical guidance)
      const roadGeometry = new THREE.TubeGeometry(roadCurve, ROAD_TUBULAR_SEGMENTS, ROAD_RADIUS, 16, false);
      const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f2a44,
        roughness: 0.95,
        metalness: 0.05,
      });
      const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
      roadMesh.position.y = 0.01;
      scene.add(roadMesh);

      const glowGeometry = new THREE.TubeGeometry(roadCurve, ROAD_TUBULAR_SEGMENTS, GLOW_RADIUS, 12, false);
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.36 });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.y = 0.06;
      scene.add(glowMesh);
      const markers = new THREE.InstancedMesh(markerGeo, markerMat, Math.max(1, count));
      markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      markers.frustumCulled = false;
      scene.add(markers);

      const stageMeta = [];
      const tmpObj = new THREE.Object3D();
      const tmpColor = new THREE.Color();

      const colorFor = (status) => {
        if (status === "locked") return 0x334155;
        if (status === "completed") return 0x22c55e;
        if (status === "in-progress") return 0xf59e0b;
        return 0x3b82f6;
      };

      const htmlColorFor = (status) => {
        if (status === "locked") return "#64748b";
        if (status === "completed") return "#22c55e";
        if (status === "in-progress") return "#f59e0b";
        return "#3b82f6";
      };

      let previousCompleted = true;
      for (let i = 0; i < count; i++) {
        const stage = orderedStages[i];
        const backendStatus = stage.participantStatus || stage.status || "available";
        const backendLocked = backendStatus === "locked";
        const backendCompleted = backendStatus === "completed";
        const sequentialLocked = i === 0 ? false : !previousCompleted;
        const effectiveLocked = backendLocked || sequentialLocked;

        const effectiveStatus = effectiveLocked
          ? "locked"
          : backendStatus;

        const tt = count <= 1 ? 0 : i / (count - 1);
        const p = roadCurve.getPointAt(tt);
        const p2 = roadCurve.getPointAt(Math.min(1, tt + 0.01));
        const dirVec = new THREE.Vector3().subVectors(p2, p);
        const rotY = Math.atan2(dirVec.x, dirVec.z);

        // Slight lateral offset so markers sit "on the road" nicely
        const x = p.x;
        const z = p.z;
        tmpObj.position.set(x, 1.35, z);
        tmpObj.rotation.set(0, rotY, 0);
        tmpObj.updateMatrix();
        markers.setMatrixAt(i, tmpObj.matrix);
        tmpColor.setHex(colorFor(effectiveStatus));
        markers.setColorAt(i, tmpColor);

        stageMeta.push({
          id: stage._id,
          title: stage.title,
          locked: effectiveLocked,
          status: effectiveStatus,
          position: new THREE.Vector3(x, 1.35, z),
          order: stage.order,
        });

        previousCompleted = backendCompleted;
      }
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;

      // Road centerline (extra schema clarity)
      if (count >= 2) {
        const linePoints = roadCurve.getPoints(140);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.55 });
        const line = new THREE.Line(lineGeo, lineMat);
        line.position.y = 0.09;
        scene.add(line);
      }

      // Subtle particle fireflies (very low cost)
      const fireflyCount = Math.min(220, 80 + count * 6);
      const fireflyPositions = new Float32Array(fireflyCount * 3);
      const fireflyColors = new Float32Array(fireflyCount * 3);
      const c1 = new THREE.Color(0x22d3ee);
      const c2 = new THREE.Color(0xa78bfa);
      for (let i = 0; i < fireflyCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 18 + Math.random() * 110;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const y = 1.4 + Math.random() * 14;
        fireflyPositions[i * 3 + 0] = x;
        fireflyPositions[i * 3 + 1] = y;
        fireflyPositions[i * 3 + 2] = z;
        const cc = (Math.random() > 0.5 ? c1 : c2).clone().multiplyScalar(0.9 + Math.random() * 0.6);
        fireflyColors[i * 3 + 0] = cc.r;
        fireflyColors[i * 3 + 1] = cc.g;
        fireflyColors[i * 3 + 2] = cc.b;
      }
      const fireflyGeo = new THREE.BufferGeometry();
      fireflyGeo.setAttribute("position", new THREE.BufferAttribute(fireflyPositions, 3));
      fireflyGeo.setAttribute("color", new THREE.BufferAttribute(fireflyColors, 3));
      const fireflyMat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.7 });
      const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
      scene.add(fireflies);

      // Raycaster for interactions
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const setMouseFromEvent = (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      };

      let needsRender = true;

      const updateStageLabels = () => {
        const el = mountRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const next = stageMeta.map((m) => {
          const p = m.position.clone();
          p.y = p.y + 2.8;
          p.project(camera);
          const x = (p.x * 0.5 + 0.5) * rect.width;
          const y = (-p.y * 0.5 + 0.5) * rect.height;
          return {
            id: m.id,
            title: m.title,
            order: m.order,
            status: m.status,
            locked: m.locked,
            color: htmlColorFor(m.status),
            x,
            y,
            visible: p.z > -1 && p.z < 1,
          };
        });
        setLabelPositions(next);
      };

      const renderOnce = () => {
        if (disposed) return;
        needsRender = true;
        if (rafId == null) {
          rafId = requestAnimationFrame(tick);
        }
      };

      const tick = () => {
        rafId = null;
        if (disposed) return;
        controls.update();
        if (!needsRender) return;
        needsRender = false;
        renderer.render(scene, camera);
        updateStageLabels();
      };

      const onResize = () => {
        const next = getSize();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(next.width, next.height);
        camera.aspect = next.width / next.height;
        camera.updateProjectionMatrix();
        renderOnce();
      };

      const onPointerMove = (event) => {
        setMouseFromEvent(event);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(markers);
        if (hits.length && hits[0].instanceId != null) {
          const idx = hits[0].instanceId;
          const meta = stageMeta[idx];
          if (meta) {
            setHoveredStageTitle(meta.title);
            setHoverPos({ x: event.clientX, y: event.clientY });
          } else {
            setHoveredStageTitle(null);
          }
        } else {
          setHoveredStageTitle(null);
        }
        renderOnce();
      };

      const onClick = (event) => {
        setMouseFromEvent(event);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(markers);
        if (hits.length && hits[0].instanceId != null) {
          const meta = stageMeta[hits[0].instanceId];
          if (meta && !meta.locked) {
            navigate(`/map/mission/${meta.id}`);
          }
        }
      };

      const onControlsChange = () => {
        renderOnce();
      };

      window.addEventListener("resize", onResize);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("click", onClick);
      controls.addEventListener("change", onControlsChange);

      // Initial render
      renderOnce();

      // Cleanup
      return () => {
        disposed = true;
        if (rafId != null) cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("click", onClick);
        controls.removeEventListener("change", onControlsChange);
        controls.dispose();

        markerGeo.dispose();
        markerMat.dispose();
        roadGeometry.dispose();
        roadMaterial.dispose();
        glowGeometry.dispose();
        glowMaterial.dispose();
        groundGeometry.dispose();
        groundMaterial.dispose();
        zoneGeo.dispose();
        villageMat.dispose();
        forestMat.dispose();
        castleMat.dispose();
        glowRing.geometry.dispose();
        glowRing.material.dispose();
        fireflyGeo.dispose();
        fireflyMat.dispose();

        houseBodyGeo.dispose();
        houseRoofGeo.dispose();
        houseMat.dispose();
        houseRoofMat.dispose();
        trunkGeo.dispose();
        leavesGeo.dispose();
        trunkMat.dispose();
        leavesMat.dispose();

        towerGeo.dispose();
        capGeo.dispose();
        keep.geometry.dispose();
        wallN.geometry.dispose();
        wallE.geometry.dispose();

        if (renderer?.domElement && mountRef.current?.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer?.dispose();
      };
    } catch (e) {
      console.error("WorldMap3D init failed", e);
      setThreeError(e?.message || String(e));
      if (renderer?.domElement && mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      return undefined;
    }
  }, [loading, error, stages, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading map...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center">Error loading stages: {error}</div>;
  if (threeError) return <div className="min-h-screen flex items-center justify-center">3D engine error: {threeError}</div>;

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(900px 600px at 50% 55%, rgba(34,211,238,0.14), rgba(167,139,250,0.10) 35%, rgba(245,158,11,0.06) 58%, rgba(2,6,23,0.0) 74%), linear-gradient(to bottom, rgba(2,6,23,0.12), rgba(2,6,23,0.80))",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {hoveredStageTitle && (
        <div
          style={{
            position: "fixed",
            left: hoverPos.x + 14,
            top: hoverPos.y + 14,
            zIndex: 50,
            pointerEvents: "none",
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(2, 6, 23, 0.75)",
            border: "1px solid rgba(96, 165, 250, 0.35)",
            color: "#e2e8f0",
            fontSize: 12,
            fontFamily: "system-ui, sans-serif",
            backdropFilter: "blur(6px)",
            maxWidth: 320,
          }}
        >
          {hoveredStageTitle}
        </div>
      )}

      {/* Always-visible labels like a real game map schema */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
        {labelPositions.map((l) => {
          const Icon = l.locked
            ? Lock
            : l.order === 1
              ? Sword
              : l.order === 2
                ? Cpu
                : l.order === 3
                  ? Shield
                  : l.order >= 10
                    ? Trophy
                    : Castle;

          if (!l.visible) return null;
          return (
            <div
              key={l.id}
              style={{
                position: "absolute",
                left: l.x,
                top: l.y,
                transform: "translate(-50%, -100%)",
                padding: "7px 10px",
                borderRadius: 12,
                background: "rgba(2, 6, 23, 0.62)",
                border: `1px solid ${l.locked ? "rgba(100,116,139,0.25)" : "rgba(56,189,248,0.25)"}`,
                boxShadow: `0 0 0 1px rgba(2,6,23,0.55), 0 10px 25px rgba(0,0,0,0.35), 0 0 18px ${l.color}22`,
                color: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 8,
                maxWidth: 240,
                backdropFilter: "blur(6px)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${l.color}22`,
                  border: `1px solid ${l.color}55`,
                  color: l.color,
                  flex: "0 0 auto",
                }}
              >
                <Icon size={LABEL_ICON_SIZE} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.title}
                </div>
                <div style={{ fontSize: 10, marginTop: 2, color: l.locked ? "#94a3b8" : l.color, fontWeight: 700 }}>
                  {String(l.status || "available").toUpperCase()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
