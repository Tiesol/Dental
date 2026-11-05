import { expect, type Page } from '@playwright/test';

export class MisCitasPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async abrir() {
    await this.page.getByRole('link', { name: 'Mis citas' }).click();
    await expect(this.page.getByRole('heading', { name: 'Mis citas' })).toBeVisible();
  }

  async verHistorial() {
    await this.page.getByRole('tab', { name: 'Historial' }).click();
  }

  filas() {
    return this.page.locator('[data-testid^="cita-"]');
  }

  fila(citaId: string) {
    return this.page.getByTestId(`cita-${citaId}`);
  }

  async abrirCita(citaId: string) {
    await this.fila(citaId).getByRole('link').click();
  }
}
