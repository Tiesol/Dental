import { expect, type Page } from '@playwright/test';

export class AgendaPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async abrir() {
    await this.page.getByRole('link', { name: 'Agenda' }).click();
    await expect(this.page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  }

  fila(citaId: string) {
    return this.page.getByTestId(`cita-${citaId}`);
  }

  async abrirCita(citaId: string) {
    await this.fila(citaId).getByRole('link').click();
  }

  estado() {
    return this.page.getByTestId('estado-cita');
  }

  async iniciarAtencion() {
    await this.page.getByTestId('btn-iniciar-atencion').click();
  }

  async registrarObservacion(texto: string) {
    await this.page.getByLabel('Observación', { exact: true }).fill(texto);
    await this.page.getByTestId('btn-registrar-observacion').click();
  }

  async finalizar() {
    await this.page.getByTestId('btn-finalizar').click();
  }
}
