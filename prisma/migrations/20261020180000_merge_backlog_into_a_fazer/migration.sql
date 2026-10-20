-- Une colunas "Backlog" em "A Fazer" (mesmo significado) e remove Backlog.

-- 1) Se o board tem Backlog e A Fazer: move as tarefas para A Fazer
UPDATE "Task" AS t
SET "columnId" = af.id
FROM "BoardColumn" AS bl
INNER JOIN "BoardColumn" AS af
  ON af."boardId" = bl."boardId"
 AND af.name = 'A Fazer'
WHERE bl.name = 'Backlog'
  AND t."columnId" = bl.id;

-- 2) Se o board só tem Backlog (sem A Fazer): renomeia para A Fazer
UPDATE "BoardColumn" AS bl
SET
  name = 'A Fazer',
  color = '#60a5fa'
WHERE bl.name = 'Backlog'
  AND NOT EXISTS (
    SELECT 1
    FROM "BoardColumn" AS af
    WHERE af."boardId" = bl."boardId"
      AND af.name = 'A Fazer'
  );

-- 3) Remove colunas Backlog restantes (já sem tarefas)
DELETE FROM "BoardColumn"
WHERE name = 'Backlog';
