import { effect, inject, Injectable, signal, WritableSignal } from "@angular/core";
import { Dataset } from "../interfaces";
import { BrowseService } from "./browse.service";
import { ExploreService } from "../routes/spongeffects/explore/service/explore.service";

@Injectable({ providedIn: 'root' })
export class GlobalService {

    /** 
     * The globally selected dataset (disease + subtype).
     * Used to sync selection between Browse, Explore, and Predict tabs.
     */
    readonly selectedDataset$: WritableSignal<Dataset | undefined> = signal(undefined);

    /**
     * The globally selected level ('gene' or 'transcript').
     * Primarily used in SPONGE v2+ to sync molecular granularity.
     */
    readonly selectedLevel$: WritableSignal<'gene' | 'transcript'> = signal('gene');

    /**
     * Convenience method to update the global dataset.
     */
    setDataset(dataset: Dataset | undefined, source?: string) {
        console.log(`[GlobalService] Dataset set to ${dataset?.disease_name} from ${source || 'unknown'}`);
        this.selectedDataset$.set(dataset);
    }

    /**
     * Convenience method to update the global level.
     */
    setLevel(level: 'gene' | 'transcript') {
        this.selectedLevel$.set(level);
    }

    constructor() {
        effect(() => {
            console.log(`[GlobalService] Dataset changed to:`, this.selectedDataset$());
        });
        effect(() => {
            console.log(`[GlobalService] Level changed to:`, this.selectedLevel$());
        });
    }

}
