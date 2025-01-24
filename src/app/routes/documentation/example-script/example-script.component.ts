import { Component, inject } from '@angular/core';
import { HighlightPlusModule } from 'ngx-highlightjs/plus';
import { Highlight } from 'ngx-highlightjs';
import { HttpService } from '../../../services/http.service';
import { AsyncPipe } from '@angular/common';
import FileSaver from 'file-saver';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-example-script',
  imports: [HighlightPlusModule, Highlight, AsyncPipe, MatButton, MatIcon],
  templateUrl: './example-script.component.html',
  styleUrl: './example-script.component.scss',
})
export class ExampleScriptComponent {
  http = inject(HttpService);

  content$ = this.http.getHtmlRequest('./example.py');

  async download() {
    const content = await this.content$;
    const file = new File([content], 'example.py');
    FileSaver.saveAs(file);
  }

  async copy() {
    await navigator.clipboard.writeText(await this.content$);
  }
}
