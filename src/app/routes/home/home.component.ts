import {Component} from '@angular/core';
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {FormsModule} from "@angular/forms";
import {MatAnchor, MatButton} from "@angular/material/button";
import {RouterLink} from "@angular/router";
import {CarouselComponent, SlideComponent} from "ngx-bootstrap/carousel";

@Component({
  selector: 'app-home',
  imports: [
    MatFormField,
    MatInput,
    FormsModule,
    MatLabel,
    MatButton,
    RouterLink,
    MatAnchor,
    CarouselComponent,
    SlideComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  searchGene: string = '';

  imageRoot: string = '/';
  images: string[] = ['1.svg', '2.png', '3.svg']

}
