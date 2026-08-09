import { prisma } from "@/lib/prisma";

/**
 * Example server component that renders a list of departments.
 * Used to demonstrate the server component testing pattern.
 */
export async function DepartmentList() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <ul data-testid="department-list">
      {departments.map((dept) => (
        <li key={dept.id} data-testid={`dept-${dept.id}`}>
          <span data-testid={`dept-${dept.id}-name`}>{dept.name}</span>
          <span data-testid={`dept-${dept.id}-fee`}>₹{dept.consultationFee}</span>
        </li>
      ))}
    </ul>
  );
}
