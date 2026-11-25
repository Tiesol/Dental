import { expect, type Page } from '@playwright/test';

export class ReservaPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // La reserva no está en el menú: se abre desde el botón "Reservar cita" de Mis citas.
  async abrir() {
    await this.page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Mis citas' })
      .click();
    await this.page.getByTestId('link-reservar').click();
    await expect(this.page.getByRole('heading', { name: 'Reservar cita' })).toBeVisible();
  }

  async elegirServicio(nombre: string) {
    await this.page.getByRole('button', { name: `Elegir ${nombre}` }).click();
  }

  async elegirOdontologo(nombre: string) {
    await this.page.getByRole('button', { name: `Elegir ${nombre}` }).click();
  }

  async elegirFecha(fecha: string) {
    await this.page.getByTestId('input-fecha').fill(fecha);
  }

  slot(hora: string) {
    return this.page.getByTestId(`slot-${hora}`);
  }

  async elegirSlot(hora: string) {
    await this.slot(hora).click();
  }

  async confirmar() {
    await this.page.getByTestId('btn-reservar').click();
  }

  // Deja el asistente con los horarios de una fecha a la vista.
  async hastaLosHorarios(servicio: string, odontologo: string, fecha: string) {
    await this.abrir();
    await this.elegirServicio(servicio);
    await this.elegirOdontologo(odontologo);
    await this.elegirFecha(fecha);
  }
}
