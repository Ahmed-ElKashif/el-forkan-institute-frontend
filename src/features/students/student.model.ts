/* The student list row, typed to the columns the table renders. The API's
   `StudentView` (src/students/students.service.ts) carries more — address,
   markaz, birth date, national-id presence — none of which the list shows, so
   they are not modelled here. A national ID never rides along in a list
   response at all; it has its own audited endpoint. */
export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  gender: string;
  phone: string | null;
  status: string;
}

/** The list query the screen owns. `pageSize` is fixed (`DEFAULT_PAGE_SIZE`),
 *  so only the page and the search term vary. An empty term means "no filter". */
export interface StudentsQuery {
  page: number;
  search: string;
}
