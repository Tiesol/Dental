import { expect, type Page } from '@playwright/test';

export class AgendaPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open() {
    await this.page.getByRole('link', { name: 'Agenda' }).click();
    await expect(this.page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  }

  row(appointmentId: string) {
    return this.page.getByTestId(`cita-${appointmentId}`);
  }

  async openAppointment(appointmentId: string) {
    await this.row(appointmentId).getByRole('link').click();
  }

  status() {
    return this.page.getByTestId('estado-cita');
  }

  async startCare() {
    await this.page.getByTestId('btn-iniciar-atencion').click();
  }

  async registerObservation(text: string) {
    await this.page.getByLabel('Observación', { exact: true }).fill(text);
    await this.page.getByTestId('btn-registrar-observacion').click();
  }

  async finish() {
    await this.page.getByTestId('btn-finalizar').click();
  }
}
