import { Component, inject } from '@angular/core';
import { HighlightPlusModule } from 'ngx-highlightjs/plus';
import { Highlight } from 'ngx-highlightjs';
import { HttpService } from '../../../services/http.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-example-script',
  imports: [HighlightPlusModule, Highlight, AsyncPipe],
  templateUrl: './example-script.component.html',
  styleUrl: './example-script.component.scss',
})
export class ExampleScriptComponent {
  http = inject(HttpService);

  content$ = this.http.getHtmlRequest('/example.py');

  constructor() {
    this.content$.then((content) => console.log(content));
  }
}
