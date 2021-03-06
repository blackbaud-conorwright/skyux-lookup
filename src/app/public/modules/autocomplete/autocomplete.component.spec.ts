import {
  async,
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';

import {
  expect,
  SkyAppTestUtility
} from '@skyux-sdk/testing';

import {
  SkyAutocompleteComponent
} from './autocomplete.component';

import {
  SkyAutocompleteInputDirective
} from './autocomplete-input.directive';

import {
  SkyAutocompleteFixtureComponent
} from './fixtures/autocomplete.component.fixture';

import {
  SkyAutocompleteFixturesModule
} from './fixtures/autocomplete-fixtures.module';

import {
  SkyAutocompleteReactiveFixtureComponent
} from './fixtures/autocomplete-reactive.component.fixture';

import {
  SkyAutocompleteSearchFunction
} from './types/autocomplete-search-function';

describe('Autocomplete component', () => {

  //#region helpers

  function getAutocompleteElement(): HTMLElement {
    return document.querySelector('sky-autocomplete') as HTMLElement;
  }

  function getInputElement(): HTMLInputElement {
    return document.getElementById('my-autocomplete-input') as HTMLInputElement;
  }

  function getSearchResultsContainer(): Element {
    return document.querySelector('.sky-autocomplete-results');
  }

  function getSearchResultItems(): NodeListOf<Element> {
    return document.querySelectorAll('.sky-autocomplete-result');
  }

  function enterSearch(newValue: string, fixture: ComponentFixture<any>): void {
    const inputElement = getInputElement();
    inputElement.value = newValue;

    SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
  }

  function blurInput(element: HTMLInputElement, fixture: ComponentFixture<any>) {
    SkyAppTestUtility.fireDomEvent(element, 'blur');
    fixture.detectChanges();
    tick();
  }

  function searchAndSelect(newValue: string, index: number, fixture: ComponentFixture<any>): void {
    const inputElement = getInputElement();

    enterSearch(newValue, fixture);

    const searchResults = getSearchResultItems();

    // Note: the ordering of these events is important!
    SkyAppTestUtility.fireDomEvent(inputElement, 'change');
    SkyAppTestUtility.fireDomEvent(searchResults[index], 'mousedown');
    blurInput(inputElement, fixture);
  }

  //#endregion

  describe('basic setup', () => {
    let fixture: ComponentFixture<SkyAutocompleteFixtureComponent>;
    let component: SkyAutocompleteFixtureComponent;
    let autocomplete: SkyAutocompleteComponent;
    let input: SkyAutocompleteInputDirective;
    let inputElement: HTMLInputElement;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [
          SkyAutocompleteFixturesModule
        ]
      });

      fixture = TestBed.createComponent(SkyAutocompleteFixtureComponent);
      component = fixture.componentInstance;
      autocomplete = component.autocomplete;
      input = component.autocompleteInput;
      inputElement = getInputElement();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should set defaults', () => {
      expect(autocomplete.data).toEqual([]);

      fixture.detectChanges();

      expect(inputElement.getAttribute('autocomplete')).toEqual('new-password');
      expect(inputElement.getAttribute('autocapitalize')).toEqual('off');
      expect(inputElement.getAttribute('autocorrect')).toEqual('off');
      expect(inputElement.getAttribute('spellcheck')).toEqual('false');
      expect(inputElement).toHaveCssClass('sky-form-control');
      expect(autocomplete.debounceTime).toEqual(0);
      expect(autocomplete.descriptorProperty).toEqual('name');
      expect(autocomplete.highlightText).toEqual('');
      expect(autocomplete.propertiesToSearch).toEqual(['name']);
      expect(autocomplete.search).toBeDefined();
      expect(autocomplete.searchFilters).toBeUndefined();
      expect(autocomplete.searchResults).toEqual([]);
      expect(autocomplete.searchResultsLimit).toBeUndefined();
      expect(autocomplete.searchResultTemplate).toBeDefined();
      expect(autocomplete.searchTextMinimumCharacters).toEqual(1);
    });

    it('should handle preselected values', fakeAsync(() => {
      const selectedValue = { name: 'Red' };
      component.model.favoriteColor = selectedValue;

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.myForm.value.favoriteColor).toEqual(selectedValue);
      expect(input.value).toEqual(selectedValue);
    }));

    it('should search', fakeAsync(() => {
      fixture.detectChanges();

      const spy = spyOn(autocomplete, 'search').and.callThrough();

      inputElement.value = 'r';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();

      expect(spy.calls.argsFor(0)[0]).toEqual('r');
    }));

    it('should search against multiple properties', fakeAsync(() => {
      component.propertiesToSearch = ['name', 'objectid'];
      fixture.detectChanges();

      inputElement.value = 'y';

      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();
      tick();

      expect(autocomplete.searchResults.length).toEqual(2);
      expect(autocomplete.searchResults[0].data.name).toEqual('Yellow');
      // The letter 'y' is in the objectid of 'Turquoise':
      expect(autocomplete.searchResults[1].data.name).toEqual('Turquoise');
    }));

    it('should search with filters', fakeAsync(() => {
      fixture.detectChanges();

      inputElement.value = 'r';

      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();

      // First, test that 'Red' is included in the results:
      let found = autocomplete.searchResults.find((result) => {
        return (result.data.name === 'Red');
      });

      // The number of search results that contain the letter 'r':
      expect(autocomplete.searchResults.length).toEqual(6);
      expect(found).toBeDefined();

      fixture.destroy();

      // Now, setup a filter, removing 'Red' from the results.
      fixture = TestBed.createComponent(SkyAutocompleteFixtureComponent);
      component = fixture.componentInstance;
      autocomplete = fixture.componentInstance.autocomplete;
      input = component.autocompleteInput;
      inputElement = getInputElement();

      fixture.componentInstance.searchFilters = [
        (searchText: string, item: any): boolean => {
          return (item.name !== 'Red');
        }
      ];

      fixture.detectChanges();

      inputElement.value = 'r';

      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();
      tick();

      found = autocomplete.searchResults.find((result) => {
        return (result.data.name === 'Red');
      });

      expect(found).toBeUndefined();
      expect(autocomplete.searchResults.length).toEqual(5);
    }));

    it('should show a no results found message', fakeAsync(() => {
      const expectedMessage = 'No matching items found';
      fixture.detectChanges();

      inputElement.value = 'rasdasdlhasdjklh';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();

      const container = getSearchResultsContainer();
      expect(container.textContent.trim()).toBe(expectedMessage);
    }));

    it('should show a custom no results found message', fakeAsync(() => {
      const expectedMessage = 'Custom message';
      component.customNoResultsMessage = expectedMessage;
      fixture.detectChanges();

      inputElement.value = 'rasdasdlhasdjklh';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();

      const container = getSearchResultsContainer();
      expect(container.textContent.trim()).toBe(expectedMessage);
    }));

    it('should allow custom search result template', fakeAsync(() => {
      component.searchResultTemplate = component.customSearchResultTemplate;
      fixture.detectChanges();

      inputElement.value = 'r';

      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();
      tick();

      const customElement = getSearchResultsContainer()
        .querySelector('.custom-search-result-id') as HTMLElement;

      expect(customElement).not.toBeNull();
    }));

    it('should focus the first search result after being opened', fakeAsync(() => {
      fixture.detectChanges();
      inputElement.value = 'r';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();
      tick();
      expect(getSearchResultItems().item(0)).toHaveCssClass('selected');
    }));

    it('should limit search results', fakeAsync(() => {
      component.searchResultsLimit = 1;
      fixture.detectChanges();

      // The letter 'r' should return multiple results:
      inputElement.value = 'r';

      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();
      fixture.detectChanges();
      tick();

      expect(autocomplete.searchResults.length).toEqual(1);
    }));

    it('should not search if search text empty', fakeAsync(() => {
      fixture.detectChanges();

      const spy = spyOn(autocomplete, 'search').and.callThrough();

      inputElement.value = '';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();

      expect(spy).not.toHaveBeenCalled();
    }));

    it('should not search if search text is not long enough', fakeAsync(() => {
      component.searchTextMinimumCharacters = 3;
      fixture.detectChanges();

      const spy = spyOn(autocomplete, 'search').and.callThrough();

      // First, verify that the search will run with 3 characters.
      inputElement.value = '123';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();

      expect(spy).toHaveBeenCalled();
      spy.calls.reset();

      // Finally, verify that it will not search with fewer characters.
      inputElement.value = '1';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();

      expect(spy).not.toHaveBeenCalled();
    }));

    it('should allow for custom search function', fakeAsync(() => {
      let customSearchCalled = false;
      const customFunction: SkyAutocompleteSearchFunction =
        (searchText: string): Promise<any> => {
          return new Promise((resolve: Function) => {
            customSearchCalled = true;
            resolve([
              { name: 'Red' }
            ]);
          });
        };

      component.search = customFunction;

      fixture.detectChanges();

      const spy = spyOn(autocomplete, 'search').and.callThrough();

      inputElement.value = 'r';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();

      expect(spy.calls.argsFor(0)[0]).toEqual('r');
      expect(customSearchCalled).toEqual(true);
    }));

    it('should handle items that do not have the descriptor property',
      fakeAsync(() => {
        component.data = [{
          foo: 'bar'
        }];

        fixture.detectChanges();

        const spy = spyOn(autocomplete, 'search').and.callThrough();

        inputElement.value = 'r';

        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
        tick();
        fixture.detectChanges();
        tick();

        expect(autocomplete.searchResults.length).toEqual(0);
        expect(spy.calls.argsFor(0)[0]).toEqual('r');
      })
    );

    it('should handle disabled input', fakeAsync(() => {

      inputElement.disabled = true;

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const spy = spyOn(autocomplete, 'search').and.callThrough();

      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick();

      expect(spy).not.toHaveBeenCalled();
    }));

    it('should handle missing skyAutocomplete directive', fakeAsync(() => {
      fixture.detectChanges();
      component.autocomplete['inputDirective'] = undefined;
      tick();

      try {
        autocomplete.ngAfterContentInit();
      } catch (e) {
        expect(e.message.indexOf('The SkyAutocompleteComponent requires a ContentChild input') > -1).toEqual(true);
      }
    }));

    it('should set the width of the dropdown when a search is performed', fakeAsync(() => {
      const adapterSpy = spyOn(autocomplete['adapterService'], 'setDropdownWidth').and.callThrough();
      const rendererSpy = spyOn(autocomplete['adapterService']['renderer'], 'setStyle').and.callThrough();

      fixture.detectChanges();
      tick();

      enterSearch('r', fixture);

      expect(adapterSpy).toHaveBeenCalledWith(autocomplete['elementRef'], autocomplete['resultsRef']);

      const dropdownElement = getSearchResultsContainer();
      const autocompleteElement = getAutocompleteElement();
      const formattedWidth = `${autocompleteElement.getBoundingClientRect().width}px`;

      expect(rendererSpy).toHaveBeenCalledWith(dropdownElement, 'width', formattedWidth);
    }));

    it('should set the width of the dropdown on window resize', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      enterSearch('r', fixture);

      const adapterSpy = spyOn(autocomplete['adapterService'], 'setDropdownWidth').and.callThrough();
      const rendererSpy = spyOn(autocomplete['adapterService']['renderer'], 'setStyle').and.callThrough();

      SkyAppTestUtility.fireDomEvent(window, 'resize');
      fixture.detectChanges();
      tick();

      expect(adapterSpy).toHaveBeenCalledWith(autocomplete['elementRef'], autocomplete['resultsRef']);

      const dropdownElement = getSearchResultsContainer();
      const autocompleteElement = getAutocompleteElement();
      const formattedWidth = `${autocompleteElement.getBoundingClientRect().width}px`;

      expect(rendererSpy).toHaveBeenCalledWith(dropdownElement, 'width', formattedWidth);
    }));

    it('should search after debounce time', fakeAsync(() => {
      component.debounceTime = 400;
      fixture.detectChanges();

      const spy = spyOn(autocomplete, 'search').and.callThrough();

      inputElement.value = 'r';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');

      // The search method should not execute at this time.
      tick(10);
      fixture.detectChanges();

      inputElement.value = 're';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick(10);
      fixture.detectChanges();

      inputElement.value = 'red';
      SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
      tick(10);
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();

      // Wait for the remaining debounce time.
      tick(400);
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
      expect(spy.calls.count()).toEqual(1);
    }));

    it('should emit an undefined value when text input is cleared',
      fakeAsync(() => {
        fixture.detectChanges();
        inputElement = getInputElement();

        // No changes should have been emitted yet.
        expect(component.selectionFromChangeEvent).toBeUndefined();

        // Type 'r' to activate the autocomplete dropdown, then click the first result.
        inputElement.value = 'r';
        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
        tick();
        fixture.detectChanges();
        const firstItem = getSearchResultItems().item(0);
        SkyAppTestUtility.fireDomEvent(firstItem, 'mousedown');
        tick();

        // Expect new changes to have been emitted.
        expect(component.selectionFromChangeEvent).toEqual({ selectedItem: { name: 'Red', objectid: 'abc' } });

        // Clear out the input.
        input.inputTextValue = '';
        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
        tick();

        // An undefined selectedItem should have been emitted.
        expect(component.selectionFromChangeEvent).toEqual({ selectedItem: undefined });
      })
    );

    it('should be accessible', async(() => {
      const axeConfig = {
        rules: {
          'region': {
            enabled: false
          }
        }
      };

      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(document.body).toBeAccessible(() => {
          fixture.detectChanges();
          inputElement.value = 'r';
          SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
          fixture.detectChanges();
          fixture.whenStable().then(() => {
            expect(document.body).toBeAccessible(() => {}, axeConfig);
          });
        }, axeConfig);
      });
    }));

    describe('highlighting', () => {
      it('should highlight when one letter is pressesd',
        fakeAsync(() => {
          fixture.detectChanges();
          tick();
          fixture.detectChanges();

          enterSearch('r', fixture);
          tick();
          fixture.detectChanges();

          expect(getSearchResultsContainer().querySelector('mark').innerHTML.trim().toLowerCase()).toBe('r');
          expect(getSearchResultsContainer().querySelectorAll('mark').length).toBe(6);
        })
      );

      it('should highlight when returning from a no results search',
        fakeAsync(() => {
          fixture.detectChanges();
          tick();
          fixture.detectChanges();

          enterSearch('red4', fixture);
          tick();
          fixture.detectChanges();

          expect(getSearchResultsContainer().querySelectorAll('mark').length).toBe(0);
          enterSearch('red', fixture);
          tick();
          fixture.detectChanges();

          expect(getSearchResultsContainer().querySelector('mark').innerHTML.trim().toLowerCase()).toBe('red');
          expect(getSearchResultsContainer().querySelectorAll('mark').length).toBe(1);
        })
      );

      it('should highlight when returning from a more specific search to a less specific one',
        fakeAsync(() => {
          fixture.detectChanges();
          tick();
          fixture.detectChanges();

          enterSearch('bla', fixture);
          tick();
          fixture.detectChanges();

          expect(getSearchResultsContainer().querySelector('mark').innerHTML.trim().toLowerCase()).toBe('bla');
          expect(getSearchResultsContainer().querySelectorAll('mark').length).toBe(1);
          enterSearch('bl', fixture);
          tick();
          fixture.detectChanges();

          expect(getSearchResultsContainer().querySelector('mark').innerHTML.trim().toLowerCase()).toBe('bl');
          expect(getSearchResultsContainer().querySelectorAll('mark').length).toBe(2);
        })
      );
    });

    describe('keyboard interactions', () => {
      it('should notify selection when enter key pressed', fakeAsync(() => {
        fixture.detectChanges();

        inputElement.value = 'r';
        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup', {
          keyboardEventInit: { key: 'R' }
        });
        tick();

        const notifySpy = spyOn(autocomplete.selectionChange, 'emit')
          .and.callThrough();

        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'Enter' }
        });
        tick();

        expect(input.value.name).toEqual('Red');
        expect(notifySpy).toHaveBeenCalledWith({
          selectedItem: input.value
        });
      }));

      it('should notify selection when tab key pressed', fakeAsync(() => {
        fixture.detectChanges();

        inputElement.value = 'r';
        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
        tick();

        const notifySpy = spyOn(autocomplete.selectionChange, 'emit')
          .and.callThrough();

        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'Tab' }
        });
        tick();

        expect(input.value.name).toEqual('Red');
        expect(notifySpy).toHaveBeenCalledWith({
          selectedItem: input.value
        });
      }));

      it('should navigate items with arrow keys', fakeAsync(() => {
        fixture.detectChanges();

        enterSearch('r', fixture);
        expect(getSearchResultItems().item(0)).toHaveCssClass('selected');

        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'ArrowDown' }
        });
        fixture.detectChanges();
        tick();

        expect(getSearchResultItems().item(1)).toHaveCssClass('selected');

        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'ArrowUp' }
        });
        fixture.detectChanges();
        tick();

        expect(getSearchResultItems().item(0)).toHaveCssClass('selected');

        // Move up again to loop back to the bottom of the list.
        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'Up' }
        });
        fixture.detectChanges();
        tick();

        expect(getSearchResultItems().item(5)).toHaveCssClass('selected');

        // Move down to loop back to the top.
        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'Down' }
        });
        fixture.detectChanges();
        tick();

        expect(getSearchResultItems().item(0)).toHaveCssClass('selected');

      }));

      it('should close the menu when escape key pressed', fakeAsync(() => {
        fixture.detectChanges();

        inputElement.value = 'r';
        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
        tick();

        SkyAppTestUtility.fireDomEvent(inputElement, 'keydown', {
          keyboardEventInit: { key: 'Escape' }
        });
        fixture.detectChanges();
        tick();

        expect(autocomplete.searchResults.length).toEqual(0);
        expect(getSearchResultsContainer()).toBeNull();
      }));

      it('should reset input text value to descriptor value on blur',
        fakeAsync(() => {
          fixture.detectChanges();

          const selectedValue = { name: 'Red' };
          component.model.favoriteColor = selectedValue;

          fixture.detectChanges();
          tick();
          fixture.detectChanges();

          input.inputTextValue = 're';

          expect(inputElement.value).toEqual('re');

          SkyAppTestUtility.fireDomEvent(inputElement, 'blur');
          tick();

          expect(component.myForm.value.favoriteColor).toEqual(selectedValue);
          expect(input.value).toEqual(selectedValue);
          expect(inputElement.value).toEqual(selectedValue.name);
        })
      );

      it('should not reset input text value if unchanged', fakeAsync(() => {
        fixture.detectChanges();

        const selectedValue = { name: 'Red' };
        component.model.favoriteColor = selectedValue;

        fixture.detectChanges();
        tick();
        fixture.detectChanges();

        input.inputTextValue = 'Red';

        const spy = spyOnProperty(input, 'inputTextValue', 'set').and.callThrough();

        expect(inputElement.value).toEqual('Red');

        SkyAppTestUtility.fireDomEvent(inputElement, 'blur');
        tick();

        expect(spy).not.toHaveBeenCalled();
      }));

      it('should clear the input selected value if text value empty on blur',
        fakeAsync(() => {
          fixture.detectChanges();

          const selectedValue = { name: 'Red' };
          component.model.favoriteColor = selectedValue;

          fixture.detectChanges();
          tick();
          fixture.detectChanges();

          input.inputTextValue = '';
          SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');

          expect(inputElement.value).toEqual('');

          SkyAppTestUtility.fireDomEvent(inputElement, 'blur');
          fixture.detectChanges();
          tick();

          expect(component.myForm.value.favoriteColor).toBeUndefined();
          expect(input.value).toBeUndefined();
          expect(inputElement.value).toEqual('');
        })
      );

      it('should clear the input selected value if the search field is empty',
        fakeAsync(() => {
          fixture.detectChanges();

          const selectedValue: { name: string } = undefined;
          component.model.favoriteColor = selectedValue;

          fixture.detectChanges();
          tick();
          fixture.detectChanges();

          SkyAppTestUtility.fireDomEvent(inputElement, 'blur');
          tick();

          expect(component.myForm.value.favoriteColor).toBeUndefined();
          expect(input.value).toBeUndefined();
          expect(inputElement.value).toEqual('');
        })
      );
    });

    describe('mouse interactions', () => {
      it('should notify selection change on item click', fakeAsync(() => {
        fixture.detectChanges();

        inputElement.value = 'r';
        SkyAppTestUtility.fireDomEvent(inputElement, 'keyup');
        tick();
        fixture.detectChanges();

        const notifySpy = spyOn(autocomplete.selectionChange, 'emit')
          .and.callThrough();
        const firstItem = getSearchResultItems().item(0);

        SkyAppTestUtility.fireDomEvent(firstItem, 'mousedown');
        tick();

        expect(input.value.name).toEqual('Red');
        expect(notifySpy).toHaveBeenCalledWith({
          selectedItem: input.value
        });
      }));
    });

    describe('Angular form statuses (template-driven)', () => {
      it('should set form states properly', fakeAsync(function () {
        fixture.detectChanges();
        tick();

        // Expect untouched and pristine.
        expect(component.myForm.touched).toEqual(false);
        expect(component.myForm.untouched).toEqual(true);
        expect(component.myForm.dirty).toEqual(false);
        expect(component.myForm.pristine).toEqual(true);
      }));

      it('should set form states properly when initialized with a value', fakeAsync(function () {
        component.model.favoriteColor = { name: 'Red' };
        fixture.detectChanges();
        tick();

        // Expect untouched and pristine.
        expect(component.myForm.touched).toEqual(false);
        expect(component.myForm.untouched).toEqual(true);
        expect(component.myForm.dirty).toEqual(false);
        expect(component.myForm.pristine).toEqual(true);
      }));

      it('should mark the control as touched on blur', fakeAsync(function () {
        fixture.detectChanges();
        tick();

        blurInput(inputElement, fixture);

        // Expect touched and pristine.
        expect(component.myForm.touched).toEqual(true);
        expect(component.myForm.untouched).toEqual(false);
        expect(component.myForm.dirty).toEqual(false);
        expect(component.myForm.pristine).toEqual(true);
      }));

      it('should mark the control as dirty when search value changes', fakeAsync(function () {
        fixture.detectChanges();
        tick();

        enterSearch('r', fixture);

        // Expect untouched and pristine, because we haven't selected a search result yet.
        expect(component.myForm.touched).toEqual(false);
        expect(component.myForm.untouched).toEqual(true);
        expect(component.myForm.dirty).toEqual(false);
        expect(component.myForm.pristine).toEqual(true);

        searchAndSelect('r', 0, fixture);

        // Expect touched and dirty.
        expect(component.myForm.touched).toEqual(true);
        expect(component.myForm.untouched).toEqual(false);
        expect(component.myForm.dirty).toEqual(true);
        expect(component.myForm.pristine).toEqual(false);

        // Expect model to be set.
        expect(component.myForm.value).toEqual({ favoriteColor: { name: 'Red', objectid: 'abc' } });
      }));

      it('should mark the control as dirty when search value changes when initialized with a value', fakeAsync(function () {
        component.model.favoriteColor = { name: 'Purple' };
        fixture.detectChanges();
        tick();

        searchAndSelect('r', 0, fixture);

        // Expect touched and dirty.
        expect(component.myForm.touched).toEqual(true);
        expect(component.myForm.untouched).toEqual(false);
        expect(component.myForm.dirty).toEqual(true);
        expect(component.myForm.pristine).toEqual(false);

        // Expect model to be set.
        expect(component.myForm.value).toEqual({ favoriteColor: { name: 'Red', objectid: 'abc' } });
      }));
    });
  });

  describe('Angular form statuses (reactive)', () => {
    let fixture: ComponentFixture<SkyAutocompleteReactiveFixtureComponent>;
    let component: SkyAutocompleteReactiveFixtureComponent;
    let inputElement: HTMLInputElement;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [
          SkyAutocompleteFixturesModule
        ]
      });

      fixture = TestBed.createComponent(SkyAutocompleteReactiveFixtureComponent);
      component = fixture.componentInstance;
      inputElement = getInputElement();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should set form states properly', fakeAsync(function () {
      fixture.detectChanges();
      tick();

      // Expect untouched and pristine.
      expect(component.reactiveForm.touched).toEqual(false);
      expect(component.reactiveForm.untouched).toEqual(true);
      expect(component.reactiveForm.dirty).toEqual(false);
      expect(component.reactiveForm.pristine).toEqual(true);
    }));

    it('should set form states properly when initialized with a value', fakeAsync(function () {
      fixture.detectChanges();
      tick();
      component.reactiveForm.get('favoriteColor').patchValue({
        name: 'Red'
      });

      // Expect untouched and pristine.
      expect(component.reactiveForm.touched).toEqual(false);
      expect(component.reactiveForm.untouched).toEqual(true);
      expect(component.reactiveForm.dirty).toEqual(false);
      expect(component.reactiveForm.pristine).toEqual(true);
    }));

    it('should mark the control as touched on blur', fakeAsync(function () {
      fixture.detectChanges();
      tick();

      blurInput(inputElement, fixture);

      // Expect touched and pristine.
      expect(component.reactiveForm.touched).toEqual(true);
      expect(component.reactiveForm.untouched).toEqual(false);
      expect(component.reactiveForm.dirty).toEqual(false);
      expect(component.reactiveForm.pristine).toEqual(true);
    }));

    it('should mark the control as dirty when search value changes', fakeAsync(function () {
      fixture.detectChanges();
      tick();

      enterSearch('r', fixture);

      // Expect untouched and pristine, because we haven't selected a search result yet.
      expect(component.reactiveForm.touched).toEqual(false);
      expect(component.reactiveForm.untouched).toEqual(true);
      expect(component.reactiveForm.dirty).toEqual(false);
      expect(component.reactiveForm.pristine).toEqual(true);

      searchAndSelect('r', 0, fixture);

      // Expect touched and dirty.
      expect(component.reactiveForm.touched).toEqual(true);
      expect(component.reactiveForm.untouched).toEqual(false);
      expect(component.reactiveForm.dirty).toEqual(true);
      expect(component.reactiveForm.pristine).toEqual(false);

      // Expect model to be set.
      expect(component.reactiveForm.value).toEqual({ favoriteColor: { name: 'Red' } });
    }));

    it('should mark the control as dirty when search value changes when initialized with a value', fakeAsync(function () {
      fixture.detectChanges();
      tick();
      component.reactiveForm.get('favoriteColor').patchValue({
        name: 'Purple'
      });

      searchAndSelect('r', 0, fixture);

      // Expect touched and dirty.
      expect(component.reactiveForm.touched).toEqual(true);
      expect(component.reactiveForm.untouched).toEqual(false);
      expect(component.reactiveForm.dirty).toEqual(true);
      expect(component.reactiveForm.pristine).toEqual(false);

      // Expect model to be set.
      expect(component.reactiveForm.value).toEqual({ favoriteColor: { name: 'Red' } });
    }));
  });
});
