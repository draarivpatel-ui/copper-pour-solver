import { spyOn } from "bun:test"
import type { AnyCircuitElement, PcbCopperPourBRep } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CopperPourPipelineSolver } from "lib/index"
import * as geometry from "lib/solvers/copper-pour/manifold-geometry-adapter"
import type { InputProblem, PipelineOutput } from "lib/types"

export function renderBoardClipRepro({
  input,
  circuitJson,
}: {
  input: InputProblem
  circuitJson: AnyCircuitElement[]
}): { svg: string; output: PipelineOutput; boardClipBuilds: number } {
  const boardOutlines = new Set(
    input.regionsForPour.map(
      (region) => region.boardOutline ?? region.boardEdgeOutline,
    ),
  )
  const subtractBlockersFromPour = geometry.subtractBlockersFromPour
  let boardClipBuilds = 0
  const spy = spyOn(geometry, "subtractBlockersFromPour").mockImplementation(
    (...args) => {
      if (boardOutlines.has(args[0])) boardClipBuilds++
      return subtractBlockersFromPour(...args)
    },
  )
  let output: PipelineOutput
  try {
    output = new CopperPourPipelineSolver(input).getOutput()
  } finally {
    spy.mockRestore()
  }

  const pours: PcbCopperPourBRep[] = output.brep_shapes_by_region.flatMap(
    (shapes, regionIndex) => {
      if (input.regionsForPour[regionIndex]!.layer !== "top") return []
      return shapes.map((brep_shape, shapeIndex) => ({
        type: "pcb_copper_pour",
        pcb_copper_pour_id: `repro_pour_${regionIndex}_${shapeIndex}`,
        shape: "brep",
        layer: "top",
        covered_with_solder_mask: true,
        brep_shape,
      }))
    },
  )
  const board = circuitJson.find((element) => element.type === "pcb_board")!
  const { width, height } = board
  if (width === undefined || height === undefined) {
    throw new Error("Board clip repro requires board dimensions")
  }
  const svg = convertCircuitJsonToPcbSvg(
    [
      ...circuitJson.filter((element) => element.type !== "pcb_copper_pour"),
      ...pours,
      {
        type: "pcb_note_text",
        pcb_note_text_id: "board_clip_build_count",
        font: "tscircuit2024",
        font_size: width / 55,
        text: `Board clip builds: ${boardClipBuilds} (${input.regionsForPour.length} regions)`,
        anchor_position: {
          x: board.center.x,
          y: board.center.y + height / 2 + width / 25,
        },
        anchor_alignment: "center",
        layer: "top",
        color: "#ffffff",
      },
    ],
    {
      layer: "top",
      width: 1200,
      height: 900,
      showPcbNotes: true,
      shouldDrawErrors: false,
      showErrorsInTextOverlay: false,
      showSolderMask: false,
      includeVersion: false,
      viewport: {
        minX: board.center.x - width / 2 - width / 20,
        maxX: board.center.x + width / 2 + width / 20,
        minY: board.center.y - height / 2 - width / 20,
        maxY: board.center.y + height / 2 + width / 10,
      },
    },
  )
  return { svg, output, boardClipBuilds }
}
