import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SkeletonLoadingComponent } from './skeleton-loading.component';

describe('SkeletonLoadingComponent', () => {
  let component: SkeletonLoadingComponent;
  let fixture: ComponentFixture<SkeletonLoadingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SkeletonLoadingComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonLoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
