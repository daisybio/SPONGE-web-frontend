import {Component} from '@angular/core';
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {FormsModule} from "@angular/forms";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-home',
  imports: [
    MatFormField,
    MatInput,
    FormsModule,
    MatLabel,
    MatButton
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  searchGene: string = '';
}
