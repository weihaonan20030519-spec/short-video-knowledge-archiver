import type { AnalyzeMode } from "../../../../shared/src/analysis/analyzeContracts.js";
import type { AnalyzeExperimentCase, AnalyzeExperimentMatrixCell } from "./experimentMatrix.js";

export type AnalyzeRubricScore = 0 | 1 | 2;

export interface AnalyzeRubricCriterion {
  id:
    | "core_conclusion_background_pollution"
    | "learning_mechanism_layer"
    | "reusable_points_transferability"
    | "section_duplication_rate"
    | "section_misalignment_rate"
    | "provider_difference_convergence";
  label: string;
  guidance: string;
}

export interface AnalyzeRubricEvaluationEntry extends AnalyzeRubricCriterion {
  score: AnalyzeRubricScore | null;
  notes: string;
}

export interface AnalyzeExperimentRubricCard {
  sampleId: string;
  mode: AnalyzeMode;
  matrixCell: AnalyzeExperimentMatrixCell;
  expectedMainJudgment: string;
  criteria: AnalyzeRubricEvaluationEntry[];
}

const RUBRIC_CRITERIA: AnalyzeRubricCriterion[] = [
  {
    id: "core_conclusion_background_pollution",
    label: "核心结论背景污染",
    guidance: "2=核心结论是判断/定义/最终结论；1=有少量背景词但主体仍是判断；0=主要是标题、时间、来源、传播信息或报告名。"
  },
  {
    id: "learning_mechanism_layer",
    label: "learning 机制层",
    guidance: "2=明确解释 why/how/机制结构；1=有结构感但更多是表层列举；0=没有机制层，基本是事实或列表。"
  },
  {
    id: "reusable_points_transferability",
    label: "reusablePoints 可迁移性",
    guidance: "2=能脱离原案例复用；1=有迁移倾向但仍依赖原素材；0=只是把结论换口吻重写。"
  },
  {
    id: "section_duplication_rate",
    label: "四板块重复率",
    guidance: "2=板块间基本不重复；1=少量同义复述；0=两个以上板块在表达同一件事。"
  },
  {
    id: "section_misalignment_rate",
    label: "四板块串位率",
    guidance: "2=结论、机制、细节、迁移分工清楚；1=局部串位；0=方法/结论/背景大面积串位。"
  },
  {
    id: "provider_difference_convergence",
    label: "provider 差异收敛",
    guidance: "2=不同 provider 在新策略下结构基本一致；1=表述不同但结构接近；0=方法学偏差仍明显。"
  }
];

function filterCriteriaForMode(mode: AnalyzeMode) {
  if (mode === "concise") {
    return RUBRIC_CRITERIA.filter(
      (criterion) =>
        criterion.id !== "learning_mechanism_layer" &&
        criterion.id !== "reusable_points_transferability"
    );
  }

  return RUBRIC_CRITERIA;
}

export function createAnalyzeExperimentRubricCard(
  experimentCase: Pick<
    AnalyzeExperimentCase,
    "sampleId" | "mode" | "matrixCell" | "expectedMainJudgment"
  >
): AnalyzeExperimentRubricCard {
  return {
    sampleId: experimentCase.sampleId,
    mode: experimentCase.mode,
    matrixCell: experimentCase.matrixCell,
    expectedMainJudgment: experimentCase.expectedMainJudgment,
    criteria: filterCriteriaForMode(experimentCase.mode).map((criterion) => ({
      ...criterion,
      score: null,
      notes: ""
    }))
  };
}

export function summarizeRubricCompletion(cards: AnalyzeExperimentRubricCard[]) {
  return cards.map((card) => ({
    sampleId: card.sampleId,
    mode: card.mode,
    matrixCell: card.matrixCell,
    totalCriteria: card.criteria.length,
    scoredCriteria: card.criteria.filter((criterion) => criterion.score !== null).length
  }));
}
