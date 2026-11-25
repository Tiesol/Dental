import { type Page } from '@playwright/test';

export class DetalleCitaPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  status() {
    return this.page.getByTestId('estado-cita');
  }

  data() {
    return this.page.getByTestId('datos-cita');
  }

  slot(time: string) {
    return this.page.getByTestId(`slot-${time}`);
  }

  async rescheduleTo(time: string) {
    await this.page.getByTestId('btn-reprogramar').click();
    await this.slot(time).click();
    await this.page.getByTestId('btn-confirmar-reprogramacion').click();
  }

  async cancel() {
    await this.page.getByTestId('btn-cancelar').click();
    await this.page.getByRole('dialog').getByRole('button', { name: 'Cancelar cita' }).click();
  }
}
