import {Component} from '@angular/core';
import {MatTableModule} from "@angular/material/table";
import {MatAnchor} from "@angular/material/button";

@Component({
  selector: 'app-download',
  imports: [
    MatTableModule,
    MatAnchor
  ],
  templateUrl: './download.component.html',
  styleUrl: './download.component.scss'
})
export class DownloadComponent {
  columns = ["name", "url"];
  downloads = [
    {
      name: "Head & neck squamous cell carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/head_&_neck_squamous_cell_carcinoma.zip"
    },
    {
      name: "Breast invasive carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/breast_invasive_carcinoma.zip"
    },
    {
      name: "Kidney clear cell carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/kidney_clear_cell_carcinoma.zip"
    },
    {
      name: "Sarcoma",
      url: "https://exbio.wzw.tum.de/sponge-files/sarcoma.zip"
    },
    {
      name: "Ovarian serous cystadenocarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/ovarian_serous_cystadenocarcinoma.zip"
    },
    {
      name: "Thymoma",
      url: "https://exbio.wzw.tum.de/sponge-files/thymoma.zip"
    },
    {
      name: "Brain lower grade glioma",
      url: "https://exbio.wzw.tum.de/sponge-files/brain_lower_grade_glioma.zip"
    },
    {
      name: "Pheochromocytoma & paraganglioma",
      url: "https://exbio.wzw.tum.de/sponge-files/pheochromocytoma_&_paraganglioma.zip"
    },
    {
      name: "Liver hepatocellular carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/liver_hepatocellular_carcinoma.zip"
    },
    {
      name: "Pancreatic adenocarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/pancreatic_adenocarcinoma.zip"
    },
    {
      name: "Pancancer",
      url: "https://exbio.wzw.tum.de/sponge-files/pancancer.zip"
    },
    {
      name: "Colon adenocarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/colon_adenocarcinoma.zip"
    },
    {
      name: "Kidney papillary cell carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/kidney_papillary_cell_carcinoma.zip"
    },
    {
      name: "Lung adenocarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/lung_adenocarcinoma.zip"
    },
    {
      name: "Uterine corpus endometrioid carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/uterine_corpus_endometrioid_carcinoma.zip"
    },
    {
      name: "Thyroid carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/thyroid_carcinoma.zip"
    },
    {
      name: "Bladder urothelial carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/bladder_urothelial_carcinoma.zip"
    },
    {
      name: "Prostate adenocarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/prostate_adenocarcinoma.zip"
    },
    {
      name: "Testicular germ cell tumor",
      url: "https://exbio.wzw.tum.de/sponge-files/testicular_germ_cell_tumor.zip"
    },
    {
      name: "Stomach adenocarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/stomach_adenocarcinoma.zip"
    },
    {
      name: "Lung squamous cell carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/lung_squamous_cell_carcinoma.zip"
    },
    {
      name: "Esophageal carcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/esophageal_carcinoma.zip"
    },
    {
      name: "Cervical & endocervical cancer",
      url: "https://exbio.wzw.tum.de/sponge-files/cervical_&_endocervical_cancer.zip"
    },
    {
      name: "Breast invasive carcinoma - Basal",
      url: "https://exbio.wzw.tum.de/sponge-files/breast_invasive_carcinoma_-_Basal.zip"
    },
    {
      name: "Breast invasive carcinoma - Her2",
      url: "https://exbio.wzw.tum.de/sponge-files/breast_invasive_carcinoma_-_Her2.zip"
    },
    {
      name: "Breast invasive carcinoma - LumA",
      url: "https://exbio.wzw.tum.de/sponge-files/breast_invasive_carcinoma_-_LumA.zip"
    },
    {
      name: "Breast invasive carcinoma - LumB",
      url: "https://exbio.wzw.tum.de/sponge-files/breast_invasive_carcinoma_-_LumB.zip"
    },
    {
      name: "Cervical & endocervical cancer - AdenoCarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/cervical_&_endocervical_cancer_-_AdenoCarcinoma.zip"
    },
    {
      name: "Esophageal carcinoma - CIN",
      url: "https://exbio.wzw.tum.de/sponge-files/esophageal_carcinoma_-_CIN.zip"
    },
    {
      name: "Esophageal carcinoma - ESCC",
      url: "https://exbio.wzw.tum.de/sponge-files/esophageal_carcinoma_-_ESCC.zip"
    },
    {
      name: "Head & neck squamous cell carcinoma - HPV-",
      url: "https://exbio.wzw.tum.de/sponge-files/head_&_neck_squamous_cell_carcinoma_-_HPV-.zip"
    },
    {
      name: "Head & neck squamous cell carcinoma - HPV+",
      url: "https://exbio.wzw.tum.de/sponge-files/head_&_neck_squamous_cell_carcinoma_-_HPV+.zip"
    },
    {
      name: "Brain lower grade glioma - IDHmut-codel",
      url: "https://exbio.wzw.tum.de/sponge-files/brain_lower_grade_glioma_-_IDHmut-codel.zip"
    },
    {
      name: "Brain lower grade glioma - IDHmut-non-codel",
      url: "https://exbio.wzw.tum.de/sponge-files/brain_lower_grade_glioma_-_IDHmut-non-codel.zip"
    },
    {
      name: "Brain lower grade glioma - IDHwt",
      url: "https://exbio.wzw.tum.de/sponge-files/brain_lower_grade_glioma_-_IDHwt.zip"
    },
    {
      name: "Sarcoma - DDLPS",
      url: "https://exbio.wzw.tum.de/sponge-files/sarcoma_-_DDLPS.zip"
    },
    {
      name: "Sarcoma - LMS",
      url: "https://exbio.wzw.tum.de/sponge-files/sarcoma_-_LMS.zip"
    },
    {
      name: "Sarcoma - MFS/UPS",
      url: "https://exbio.wzw.tum.de/sponge-files/sarcoma_-_MFS/UPS.zip"
    },
    {
      name: "Stomach adenocarcinoma - CIN",
      url: "https://exbio.wzw.tum.de/sponge-files/stomach_adenocarcinoma_-_CIN.zip"
    },
    {
      name: "Stomach adenocarcinoma - EBV",
      url: "https://exbio.wzw.tum.de/sponge-files/stomach_adenocarcinoma_-_EBV.zip"
    },
    {
      name: "Stomach adenocarcinoma - GS",
      url: "https://exbio.wzw.tum.de/sponge-files/stomach_adenocarcinoma_-_GS.zip"
    },
    {
      name: "Stomach adenocarcinoma - MSI",
      url: "https://exbio.wzw.tum.de/sponge-files/stomach_adenocarcinoma_-_MSI.zip"
    },
    {
      name: "Testicular germ cell tumor - non-seminoma",
      url: "https://exbio.wzw.tum.de/sponge-files/testicular_germ_cell_tumor_-_non-seminoma.zip"
    },
    {
      name: "Testicular germ cell tumor - seminoma",
      url: "https://exbio.wzw.tum.de/sponge-files/testicular_germ_cell_tumor_-_seminoma.zip"
    },
    {
      name: "Uterine corpus endometrioid carcinoma - CN_HIGH",
      url: "https://exbio.wzw.tum.de/sponge-files/uterine_corpus_endometrioid_carcinoma_-_CN_HIGH.zip"
    },
    {
      name: "Uterine corpus endometrioid carcinoma - CN_LOW",
      url: "https://exbio.wzw.tum.de/sponge-files/uterine_corpus_endometrioid_carcinoma_-_CN_LOW.zip"
    },
    {
      name: "Uterine corpus endometrioid carcinoma - MSI",
      url: "https://exbio.wzw.tum.de/sponge-files/uterine_corpus_endometrioid_carcinoma_-_MSI.zip"
    },
    {
      name: "Uterine corpus endometrioid carcinoma - POLE",
      url: "https://exbio.wzw.tum.de/sponge-files/uterine_corpus_endometrioid_carcinoma_-_POLE.zip"
    },
    {
      name: "Cervical & endocervical cancer - SquamousCarcinoma",
      url: "https://exbio.wzw.tum.de/sponge-files/cervical_&_endocervical_cancer_-_SquamousCarcinoma.zip"
    }
  ]
}
