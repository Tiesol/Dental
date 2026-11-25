import { expect, type Page } from '@playwright/test';

export class ReservaPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // La reserva no está en el menú: se abre desde el botón "Reservar cita" de Mis citas.
  async open() {
    await this.page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Mis citas' })
      .click();
    await this.page.getByTestId('link-reservar').click();
    await expect(this.page.getByRole('heading', { name: 'Reservar cita' })).toBeVisible();
  }

  async chooseService(name: string) {
    await this.page.getByRole('button', { name: `Elegir ${name}` }).click();
  }

  async chooseDentist(name: string) {
    await this.page.getByRole('button', { name: `Elegir ${name}` }).click();
  }

  async chooseDate(date: string) {
    await this.page.getByTestId('input-fecha').fill(date);
  }

  slot(time: string) {
    return this.page.getByTestId(`slot-${time}`);
  }

  async chooseSlot(time: string) {
    await this.slot(time).click();
  }

  async confirm() {
    await this.page.getByTestId('btn-reservar').click();
  }

  // Deja el asistente con los horarios de una fecha a la vista.
  async upToSlots(service: string, dentist: string, date: string) {
    await this.open();
    await this.chooseService(service);
    await this.chooseDentist(dentist);
    await this.chooseDate(date);
  }
}
