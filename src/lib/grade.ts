export type GradeInfo = {
  gradeCode: string;
  gradeLabel: string;
  gradeGroup: "preschool" | "elementary" | "junior_high" | "high_school" | "graduated";
};

export function calculateGrade(birthDate: Date, referenceDate: Date = new Date()): GradeInfo {
  const fiscalYear =
    referenceDate.getMonth() < 3
      ? referenceDate.getFullYear() - 1
      : referenceDate.getFullYear();

  const fiscalApril1 = new Date(fiscalYear, 3, 1);

  let age = fiscalApril1.getFullYear() - birthDate.getFullYear();
  const m = fiscalApril1.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && fiscalApril1.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 6) return { gradeCode: "preschool", gradeLabel: "未就学児", gradeGroup: "preschool" };
  if (age <= 11)
    return {
      gradeCode: `elementary_${age - 5}`,
      gradeLabel: `小学${age - 5}年`,
      gradeGroup: "elementary",
    };
  if (age <= 14)
    return {
      gradeCode: `junior_${age - 11}`,
      gradeLabel: `中学${age - 11}年`,
      gradeGroup: "junior_high",
    };
  if (age <= 17)
    return {
      gradeCode: `high_${age - 14}`,
      gradeLabel: `高校${age - 14}年`,
      gradeGroup: "high_school",
    };
  return { gradeCode: "graduated", gradeLabel: "卒業", gradeGroup: "graduated" };
}
