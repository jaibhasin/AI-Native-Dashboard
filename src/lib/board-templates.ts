export {
  BLANK_BOARD_ID,
  BOARD_TEMPLATE_VERSION,
  createBoardFromTemplate,
  type BoardTemplate,
} from "@/lib/board-template-core";
import { engineeringBoardTemplate } from "@/lib/board-template-engineering";
import { founderBoardTemplate } from "@/lib/board-template-founder";
import { opsBoardTemplate } from "@/lib/board-template-ops";
import { salesBoardTemplate } from "@/lib/board-template-sales";

export const BOARD_TEMPLATES = [
  founderBoardTemplate,
  engineeringBoardTemplate,
  salesBoardTemplate,
  opsBoardTemplate,
];
