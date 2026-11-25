import { expect, type Page } from '@playwright/test';

export class MisCitasPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Desde el menú: la reserva también tiene un enlace "Mis citas" para volver.
  async open() {
    await this.page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Mis citas' })
      .click();
    await expect(this.page.getByRole('heading', { name: 'Mis citas' })).toBeVisible();
  }

  async viewHistory() {
    await this.page.getByRole('tab', { name: 'Historial' }).click();
  }

  rows() {
    return this.page.locator('[data-testid^="cita-"]');
  }

  row(appointmentId: string) {
    return this.page.getByTestId(`cita-${appointmentId}`);
  }

  async openAppointment(appointmentId: string) {
    await this.row(appointmentId).getByRole('link').click();
  }
}
