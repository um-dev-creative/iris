import { unsavedChangesGuard, UNSAVED_CHANGES_MESSAGE } from './unsaved-changes.guard';

const run = (dirty: boolean) => unsavedChangesGuard({ hasUnsavedChanges: () => dirty }, null as never, null as never, null as never);

describe('unsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sin cambios deja salir sin preguntar', () => {
    const confirm = vi.spyOn(window, 'confirm');

    expect(run(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('con cambios pregunta y respeta la respuesta', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    expect(run(true)).toBe(false);
    expect(run(true)).toBe(true);
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE);
  });
});
