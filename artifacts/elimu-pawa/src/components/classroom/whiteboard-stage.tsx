
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  Keyboard,
  ListTree,
  Palette,
  PenLine,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  Type,
} from "lucide-react";
import type { WhiteboardState, WhiteboardStroke } from "@/lib/types";

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 600;
const STROKE_COLORS = ["#ffffff", "#8ab4f8", "#34d399", "#fbbf24", "#f87171", "#c084fc"];
const STROKE_WIDTHS = [2, 4, 6, 8, 10, 12];
const BACKGROUND_TEMPLATES: Array<{
  id: "grid" | "lined" | "dots" | "blank";
  label: string;
}> = [
  { id: "grid", label: "Grid" },
  { id: "lined", label: "Lined" },
  { id: "dots", label: "Dotted" },
  { id: "blank", label: "Blank" },
];

function clampPoint(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function getStrokePath(points: [number, number][]) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }

  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

export function WhiteboardStage({
  whiteboard,
  editable = false,
  locked = false,
  showControls = true,
  onChange,
  onClear,
}: {
  whiteboard: WhiteboardState;
  editable?: boolean;
  locked?: boolean;
  showControls?: boolean;
  onChange?: (next: WhiteboardState) => void;
  onClear?: () => void;
}) {
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [draftStroke, setDraftStroke] = useState<WhiteboardStroke | null>(null);
  const [strokeColor, setStrokeColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(4);
  const [openControlPanel, setOpenControlPanel] = useState<
    "tool" | "color" | "stroke" | "page" | "template" | "pages" | "shortcuts" | null
  >(null);
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [pageNameDraft, setPageNameDraft] = useState("");
  const boardRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const stylusPointerIdRef = useRef<number | null>(null);

  const activePage = useMemo(
    () =>
      whiteboard.pages[whiteboard.active_page] ?? {
        id: "page-1",
        name: "Page 1",
        background_template: "grid",
        strokes: [],
      },
    [whiteboard],
  );

  const readPoint = (clientX: number, clientY: number): [number, number] | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    const x = clampPoint(((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH, VIEWBOX_WIDTH);
    const y = clampPoint(((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT, VIEWBOX_HEIGHT);
    return [x, y];
  };

  const commitStroke = (stroke: WhiteboardStroke | null) => {
    if (!stroke || !onChange) {
      return;
    }

    const nextPages = whiteboard.pages.map((page, index) =>
      index === whiteboard.active_page
        ? {
            ...page,
            strokes: [...page.strokes, stroke],
          }
        : page,
    );

    onChange({
      ...whiteboard,
      pages: nextPages,
    });
  };

  const updateActivePage = (updater: (currentPage: WhiteboardState["pages"][number]) => WhiteboardState["pages"][number]) => {
    if (!onChange) {
      return;
    }

    const nextPages = whiteboard.pages.map((page, index) =>
      index === whiteboard.active_page ? updater(page) : page,
    );

    onChange({
      ...whiteboard,
      pages: nextPages,
    });
  };

  const handleUndoLastStroke = () => {
    if (!editable || !onChange || !activePage.strokes.length) {
      return;
    }

    updateActivePage((currentPage) => ({
      ...currentPage,
      strokes: currentPage.strokes.slice(0, -1),
    }));
  };

  const handleClearCurrentPage = () => {
    if (!editable || !onChange || !activePage.strokes.length) {
      return;
    }

    updateActivePage((currentPage) => ({
      ...currentPage,
      strokes: [],
    }));
  };

  const handleGoToPage = (nextPageIndex: number) => {
    if (!editable || !onChange) {
      return;
    }
    if (nextPageIndex < 0 || nextPageIndex >= whiteboard.pages.length) {
      return;
    }
    onChange({
      ...whiteboard,
      active_page: nextPageIndex,
    });
  };

  const handleAddPage = () => {
    if (!editable || !onChange) {
      return;
    }

    const nextPages = [
      ...whiteboard.pages,
      {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `Page ${whiteboard.pages.length + 1}`,
        strokes: [],
      },
    ];

    onChange({
      ...whiteboard,
      pages: nextPages,
      active_page: nextPages.length - 1,
    });
  };
  const handleDuplicatePage = () => {
    if (!editable || !onChange) {
      return;
    }
    const duplicatePageIndex = whiteboard.active_page + 1;
    const duplicatePage = {
      ...activePage,
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${activePage.name} copy`,
      strokes: activePage.strokes.map((stroke) => ({
        ...stroke,
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        points: [...stroke.points],
      })),
    };
    const nextPages = [...whiteboard.pages];
    nextPages.splice(duplicatePageIndex, 0, duplicatePage);
    onChange({
      ...whiteboard,
      pages: nextPages,
      active_page: duplicatePageIndex,
    });
    setPageNameDraft(duplicatePage.name);
    setOpenControlPanel("page");
  };
  const handleRenamePage = () => {
    const nextName = pageNameDraft.trim();
    if (!editable || !onChange || !nextName) {
      return;
    }
    updateActivePage((currentPage) => ({
      ...currentPage,
      name: nextName,
    }));
  };
  const handleSetBackgroundTemplate = (template: "grid" | "lined" | "dots" | "blank") => {
    if (!editable || !onChange) {
      return;
    }
    updateActivePage((currentPage) => ({
      ...currentPage,
      background_template: template,
    }));
  };
  const handleDeleteCurrentPage = () => {
    if (!editable || !onChange || whiteboard.pages.length <= 1) {
      return;
    }
    const nextPages = whiteboard.pages.filter((_, index) => index !== whiteboard.active_page);
    const nextActivePage = Math.min(whiteboard.active_page, nextPages.length - 1);
    onChange({
      ...whiteboard,
      pages: nextPages,
      active_page: nextActivePage,
    });
    setPageNameDraft(nextPages[nextActivePage]?.name ?? "");
  };
  const getControlLabelClass = (label: string) =>
    `pointer-events-none absolute left-[calc(100%+0.55rem)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/20 bg-slate-900/95 px-2 py-1 text-[10px] font-semibold text-white shadow-2xl transition-all duration-150 ${
      hoveredControl === label ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
    }`;

  const controlHoverHandlers = (label: string) => ({
    onMouseEnter: () => setHoveredControl(label),
    onMouseLeave: () => setHoveredControl((current) => (current === label ? null : current)),
    onFocus: () => setHoveredControl(label),
    onBlur: () => setHoveredControl((current) => (current === label ? null : current)),
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || locked) {
      return;
    }
    // If a stylus is actively drawing, ignore touch contacts (basic palm rejection).
    if (event.pointerType === "touch" && stylusPointerIdRef.current !== null) {
      return;
    }
    if (event.pointerType === "pen") {
      stylusPointerIdRef.current = event.pointerId;
    }

    const point = readPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftStroke({
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color: tool === "eraser" ? "#202124" : strokeColor,
      // Use pen pressure to improve stylus writing feel.
      width:
        event.pointerType === "pen"
          ? Math.min(16, Math.max(1, Math.round(lineWidth * (0.55 + Math.max(0.2, event.pressure) * 0.95))))
          : lineWidth,
      tool,
      points: [point],
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || locked || activePointerIdRef.current !== event.pointerId || !draftStroke) {
      return;
    }

    const point = readPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setDraftStroke((current) =>
      current
        ? {
            ...current,
            points: [...current.points, point],
          }
        : current,
    );
  };

  const finishStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || locked || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    activePointerIdRef.current = null;
    if (stylusPointerIdRef.current === event.pointerId) {
      stylusPointerIdRef.current = null;
    }
    commitStroke(draftStroke);
    setDraftStroke(null);
  };
  const activeBackgroundTemplate = activePage.background_template ?? "grid";
  useEffect(() => {
    if (!editable) {
      return;
    }

    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase() ?? "";
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const withMod = event.ctrlKey || event.metaKey;

      if (key === "escape") {
        setOpenControlPanel(null);
        return;
      }

      if (locked) {
        return;
      }

      if (withMod && key === "z") {
        event.preventDefault();
        handleUndoLastStroke();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        handleAddPage();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        handleDuplicatePage();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleGoToPage(whiteboard.active_page - 1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleGoToPage(whiteboard.active_page + 1);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    editable,
    locked,
    whiteboard.active_page,
    handleUndoLastStroke,
    handleAddPage,
    handleDuplicatePage,
    handleGoToPage,
  ]);

  return (
    <div className="relative h-full bg-[#101114] text-white">
      <div
        ref={boardRef}
        className={`relative flex-1 ${editable && !locked ? "cursor-crosshair touch-none" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      >
        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full bg-[#101114]">
          <defs>
            <pattern id="wbGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
            <pattern id="wbLined" width="48" height="48" patternUnits="userSpaceOnUse">
              <line x1="0" y1="24" x2={VIEWBOX_WIDTH} y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            </pattern>
            <pattern id="wbDots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="11" cy="11" r="1.1" fill="rgba(255,255,255,0.22)" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#101114" />
          {activeBackgroundTemplate === "grid" ? (
            <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#wbGrid)" />
          ) : null}
          {activeBackgroundTemplate === "lined" ? (
            <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#wbLined)" />
          ) : null}
          {activeBackgroundTemplate === "dots" ? (
            <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#wbDots)" />
          ) : null}
          {activePage.strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={getStrokePath(stroke.points)}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {editable && draftStroke ? (
            <path
              d={getStrokePath(draftStroke.points)}
              fill="none"
              stroke={draftStroke.color}
              strokeWidth={draftStroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>
      </div>
      {editable && showControls ? (
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
          <div className="flex w-10 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-black/65 p-1.5 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => setOpenControlPanel((current) => (current === "tool" ? null : "tool"))}
              title="Tool controls"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "tool" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open drawing tool controls"
              {...controlHoverHandlers("Tool controls")}
            >
              {tool === "pen" ? <PenLine className="h-4 w-4" /> : <Eraser className="h-4 w-4" />}
              <span className={getControlLabelClass("Tool controls")}>Tool controls</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenControlPanel((current) => (current === "color" ? null : "color"))}
              title="Color palette"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "color" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open color controls"
              {...controlHoverHandlers("Color palette")}
            >
              <Palette className="h-4 w-4" />
              <span className={getControlLabelClass("Color palette")}>Color palette</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenControlPanel((current) => (current === "stroke" ? null : "stroke"))}
              title="Stroke width"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "stroke" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open stroke controls"
              {...controlHoverHandlers("Stroke width")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className={getControlLabelClass("Stroke width")}>Stroke width</span>
            </button>
            <button
              type="button"
              onClick={handleUndoLastStroke}
              disabled={!activePage.strokes.length}
              title="Undo last stroke"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Undo last stroke"
              {...controlHoverHandlers("Undo last stroke")}
            >
              <RotateCcw className="h-4 w-4" />
              <span className={getControlLabelClass("Undo last stroke")}>Undo last stroke</span>
            </button>
            <button
              type="button"
              onClick={handleAddPage}
              title="Add new page"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-100 transition hover:bg-white/20"
              aria-label="Add a new whiteboard page"
              {...controlHoverHandlers("Add new page")}
            >
              <Plus className="h-4 w-4" />
              <span className={getControlLabelClass("Add new page")}>Add new page</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPageNameDraft(activePage.name);
                setOpenControlPanel((current) => (current === "page" ? null : "page"));
              }}
              title="Page tools"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "page" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open page tools"
              {...controlHoverHandlers("Page tools")}
            >
              <Type className="h-4 w-4" />
              <span className={getControlLabelClass("Page tools")}>Page tools</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenControlPanel((current) => (current === "template" ? null : "template"))}
              title="Background template"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "template" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open background templates"
              {...controlHoverHandlers("Background template")}
            >
              <StickyNote className="h-4 w-4" />
              <span className={getControlLabelClass("Background template")}>Background template</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenControlPanel((current) => (current === "pages" ? null : "pages"))}
              title="All pages"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "pages" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open page list"
              {...controlHoverHandlers("All pages")}
            >
              <ListTree className="h-4 w-4" />
              <span className={getControlLabelClass("All pages")}>All pages</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenControlPanel((current) => (current === "shortcuts" ? null : "shortcuts"))}
              title="Keyboard shortcuts"
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-100 transition ${
                openControlPanel === "shortcuts" ? "bg-[#4285f4]" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label="Open keyboard shortcuts"
              {...controlHoverHandlers("Keyboard shortcuts")}
            >
              <Keyboard className="h-4 w-4" />
              <span className={getControlLabelClass("Keyboard shortcuts")}>Keyboard shortcuts</span>
            </button>
          </div>
          {openControlPanel ? (
            <div className="absolute left-12 top-0 w-52 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur">
              {openControlPanel === "tool" ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tool</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTool("pen")}
                      className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                        tool === "pen"
                          ? "bg-[#4285f4] text-white shadow-lg shadow-blue-500/25"
                          : "bg-white/10 text-slate-200 hover:bg-white/20"
                      }`}
                    >
                      <PenLine className="h-4 w-4" />
                      Pen
                    </button>
                    <button
                      type="button"
                      onClick={() => setTool("eraser")}
                      className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                        tool === "eraser"
                          ? "bg-[#4285f4] text-white shadow-lg shadow-blue-500/25"
                          : "bg-white/10 text-slate-200 hover:bg-white/20"
                      }`}
                    >
                      <Eraser className="h-4 w-4" />
                      Eraser
                    </button>
                  </div>
                </div>
              ) : null}
              {openControlPanel === "color" ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Color</p>
                  <div className="grid grid-cols-3 gap-1">
                    {STROKE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setStrokeColor(color)}
                        className={`h-7 w-full rounded-lg border transition ${
                          strokeColor === color ? "scale-[1.03] border-white" : "border-white/30 hover:border-white/70"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {openControlPanel === "stroke" ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Stroke</p>
                  <div className="grid grid-cols-3 gap-1">
                    {STROKE_WIDTHS.map((width) => (
                      <button
                        key={width}
                        type="button"
                        onClick={() => setLineWidth(width)}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          lineWidth === width ? "bg-[#4285f4] text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
                        }`}
                      >
                        {width}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {openControlPanel === "page" ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Page tools</p>
                  <input
                    value={pageNameDraft}
                    onChange={(event) => setPageNameDraft(event.target.value)}
                    placeholder="Rename page"
                    className="w-full rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-white outline-none transition focus:border-[#8ab4f8]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleRenamePage}
                      disabled={!pageNameDraft.trim()}
                      className="inline-flex items-center justify-center rounded-lg bg-[#4285f4] px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={handleDuplicatePage}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteCurrentPage}
                    disabled={whiteboard.pages.length <= 1}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/10 px-2 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete page
                  </button>
                </div>
              ) : null}
              {openControlPanel === "pages" ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pages</p>
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {whiteboard.pages.map((page, index) => {
                      const isActive = index === whiteboard.active_page;
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => handleGoToPage(index)}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition ${
                            isActive
                              ? "bg-[#4285f4] text-white"
                              : "bg-white/10 text-slate-100 hover:bg-white/20"
                          }`}
                        >
                          <span className="truncate">
                            {index + 1}. {page.name}
                          </span>
                          <span className="ml-2 shrink-0 text-[10px] opacity-80">
                            {(page.background_template ?? "grid").toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {openControlPanel === "template" ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Template</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BACKGROUND_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSetBackgroundTemplate(template.id)}
                        className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                          activeBackgroundTemplate === template.id
                            ? "bg-[#4285f4] text-white"
                            : "bg-white/10 text-slate-100 hover:bg-white/20"
                        }`}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {openControlPanel === "shortcuts" ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Shortcuts</p>
                  <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] text-slate-100">
                    <p><span className="font-semibold text-white">Ctrl/Cmd + Z</span> - Undo stroke</p>
                    <p><span className="font-semibold text-white">N</span> - New page</p>
                    <p><span className="font-semibold text-white">D</span> - Duplicate page</p>
                    <p><span className="font-semibold text-white">Left / Right</span> - Change page</p>
                    <p><span className="font-semibold text-white">Esc</span> - Close panel</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex w-10 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/65 px-1 py-1.5 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => handleGoToPage(whiteboard.active_page - 1)}
              disabled={whiteboard.active_page === 0}
              title="Previous page"
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Go to previous whiteboard page"
              {...controlHoverHandlers("Previous page")}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className={getControlLabelClass("Previous page")}>Previous page</span>
            </button>
            <span className="text-[10px] font-semibold leading-tight text-slate-100">
              {activePage.name} ({whiteboard.active_page + 1}/{whiteboard.pages.length})
            </span>
            <button
              type="button"
              onClick={() => handleGoToPage(whiteboard.active_page + 1)}
              disabled={whiteboard.active_page >= whiteboard.pages.length - 1}
              title="Next page"
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Go to next whiteboard page"
              {...controlHoverHandlers("Next page")}
            >
              <ChevronRight className="h-4 w-4" />
              <span className={getControlLabelClass("Next page")}>Next page</span>
            </button>
          </div>
          <div className="flex w-10 flex-col gap-1.5">
            <button
              type="button"
              onClick={handleClearCurrentPage}
              disabled={!activePage.strokes.length}
              title="Clear current page"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-400/30 bg-black/65 text-rose-200 shadow-xl backdrop-blur transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Clear current page"
              {...controlHoverHandlers("Clear current page")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className={getControlLabelClass("Clear current page")}>Clear current page</span>
            </button>
            <button
              type="button"
              onClick={onClear}
              title="Reset all pages"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-400/35 bg-black/65 text-rose-200 shadow-xl backdrop-blur transition hover:bg-rose-500/15"
              aria-label="Reset entire board"
              {...controlHoverHandlers("Reset all pages")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className={getControlLabelClass("Reset all pages")}>Reset all pages</span>
            </button>
          </div>
        </div>
      ) : null}
      {editable && locked ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 shadow-xl backdrop-blur">
          Board locked
        </div>
      ) : null}
    </div>
  );
}
