import { type Page } from '@playwright/test';

export class DetalleCitaPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  estado() {
    return this.page.getByTestId('estado-cita');
  }

  datos() {
    return this.page.getByTestId('datos-cita');
  }

  slot(hora: string) {
    return this.page.getByTestId(`slot-${hora}`);
  }

  async reprogramarA(hora: string) {
    await this.page.getByTestId('btn-reprogramar').click();
    await this.slot(hora).click();
    await this.page.getByTestId('btn-confirmar-reprogramacion').click();
  }

  async cancelar() {
    await this.page.getByTestId('btn-cancelar').click();
    await this.page.getByRole('dialog').getByRole('button', { name: 'Cancelar cita' }).click();
  }
}
