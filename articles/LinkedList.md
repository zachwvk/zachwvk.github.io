Introduction
============

<a class="teaser">

This project is based upon a desire for a set of standard datastructures within the C programming language. Originally I had this goal while in my datastructures class at University. I spent a large number of hours developing an AVL Tree as an assignment, and I just couldn't settle with the idea that all that work was not general enough to re-use in different projects.

The reason this kind of re-use is hard in the C programming language is complicated, you could </a>easily create a datastructure that accepted a void pointer to the data you wished to store within the datastructure. for example, you could define this as a linked list node data type:

    typedef struct LL_NODE {
        struct LL_NODE * next;
        void * data;
    } LL_NODE;

Then define the following function signature to take a void pointer "item" and push it to the beginning of the linked list:

    int ll_push(LL_NODE * head, void * item);

This however has the downsides of adding additional dereferences to interact with the data, additionally the memory needed to make up the datastructure and save these pointers probably needs to be allocated separately from the data itself. This is due mostly to the different life-cycle of the datastructure vs the data itself.

These additional allocations require housekeeping to ensure they are managed properly, but also they carry a performance overhead due to the malloc and free calls. Finally, in order for the datastructure to be relatively easy to use these additional allocations really need to be performed by the datastructure code itself, which intentionally hides them from the user, resulting in what the Zig programming language refers to as hidden memory allocations.

Thus the definition of our `ll_push` function needs to be something like what follows:

    int ll_push(LL_NODE ** head, void * item) {
        LL_NODE * node;
        
        node = malloc(sizeof(node));
        
        if(node) {
            node->next = *head;
            node->data = item;
            
            /* return new head */
            *head = node;
            return 0;
        }
        else return 1;
    }

_Note 1: malloc may fail, this failure has to be handled, but really the datastructure cannot, we are forced pass the error on to the user, and hope that they remember to check it. As you can see this makes the datastructure library more complicated to use._

_Note 2: The use of magic numbers (0 and 1) for exit codes need to be documented somewhere. This is important to the user, but it would be nicer to have a more intuitive function signature that explains this automatically._

_Note 3: I am taking a pointer to whatever memory the user is using to hold onto the datastructure `head`. This is a convention I will use throughout this project to allow the datastructure functions to mutate any data in the datastructure including the first element. I intentionally don't check the head pointer for NULL. I expect the majority of calls to this function to be of the form `ll_push(&my_head, my_data)` in which case `head` will never be NULL._


There also is another issue with void pointer datastructures, the interface is too generic, `ll_push` may be used in one location for `struct foo`, and another location for `struct bar`, but the user is not given a clear understanding that pushing `foo` onto a list of `bar` is going to get nasty, unless you somehow have manually included type information into `foo` and `bar` so you can identify them correctly whenever you use the list.

Yet another issue is that the user is forced to rely on a cast (either implicit or explicit) to `void * item`. This also means when we expand the library to include a `ll_pop` function the user *must* explicitly cast the values back to whatever type they are storing in the list. 
This problem is exasperated by the fact that the debugger rightly treats the `void * data` element of the datastructure as just a pointer. This makes it very hard to use the datastructure, because whenever you want to use the debugger to inspect the values inside the datastructure you again have to explicitly cast the data you are storing back to whatever data type you are using during the debugging session.

All of this means it is normally far better to roll a custom datastructure that is unique to the data type instead of using all of these manual casts. For something as simple as a linked list this isn't a bad option. But for a more complex datastructure this gets more difficult.

C++ Templates
-------------

C++ has a feature called Templates that solves some of the above problems. Here you could simply define the node as follows:

    template <typename T> 
    struct LL_NODE { 
        struct LL_NODE * next;
        T * data;
    }; 
The above would allow your C++ Compiler to raise an error when you try to add a `foo` to a list of `bar`. But it doesn't solve the problems of the additional dereferences, or the hidden memory allocations

Regardless, C presumably doesn't natively support any kind of templating structure like what is present in the C++ language. 

You may respond to this and say just use C++, in fact C++ already has implementations of Standard Containers which work well. To this I have a few comments. 
* It's not always a trivial change to go from C to C++, sure carefully written C code can compile under a C++ compiler, but a lot of codebases won't, and inter operation between code compiled separately under C and C++ compliers is harry.
* Additionally some platforms, albeit hard to find, don't support C++. 
* There are also software design choices imposed upon you when you code in C++, like Object Hierarchies, and those hidden memory allocations, which are regarded by some as downsides. 
* Finally C++ has a lot of features, not all of which improve the programming experience, but in order to write much C++ code you have to have a fairly advanced understanding of all the additional C++ syntax.

Anyway, back in C land, I mentioned C doesn't have a templating system. This isn't actually entirely true, and the remainder of this article I will be discussing how the C preprocessor can be used to create a C templating system.

Hold on, I know you are now screening, at me for mentioning the C preprocessor, I will grant that reading code littered with `#ifdef`'s is not a great experience. Additionally the fact that any C symbol could alternately be either a macro or a function does make it possible to get really confused by the preprocessor. But I will counter any other dis against the preprocessor being hard to understand or debug with a simple suggestion that you learn how to use the `gcc -E` flag, or `msvc /P` to have your compiler stop after preprocessing your file. This is an extremely powerful way of developing C Macros, you can see exactly what the preprocessor has done. No matter what, the C preprocessor is done and out of the picture long before you even get a binary to run, Thus it's going to be hard for the preprocessor itself to generate runtime bugs in your software. I think many of the complaints people have against the preprocessor are from people trying to understand a Macro their colleague who left the company wrote, but neglected to check the preprocessor output.

With that out of the way, let's finally see what the preprocessor can do.

<a class="title">Preprocessor Templating System</a>
---------------------------------------------------

I will introduce this to you by showing you first an example of how it looks when used in C code.

    typedef struct message_t {
        struct message_t* next;
        int id;
        size_t len;
        uint8_t * data;
    } message_t;

    #define TEMPLATE_PREFIX message
    #define TEMPLATE_STRUCT message_t
    #define TEMPLATE_NEXT next
    #include "LinkedList.h"

As you might guess the _Magic_ is in the `LinkedList.h` file. But lets work through what is above first.

This user written code contains a structure called `message_t`, which has been setup so that it implements a Linked List. The memory for this list is contained withing the message_t structure itself, thus eliminating the need for any additional memory allocations by the datastructure. Using the three TEMPLATE `#define`'s, the user has instructed the _Magic_ `LinkedList.h` file to generate Linked List library functions with the prefix `message`, and that the data type of this library is `message_t`, and that the memory to use within the `message_t` for the next pointer is called `next`.

With that small amount of code in place, you can now write:

    message_t* messages;
    
    void receive_message(int id, size_t len, uint8_t * data)
    {
        message_t* m = malloc(sizeof(message_t));

        if (m) {
            *m = (message_t){
                .id = id,
                .len = len,
                .data = data,
            };

            message_push(&messages, m);
        }
    }

The function `message_push` has this signature:

    void message_push(message_t ** head, message_t * item);

Note the welcome lack of a return value. Now the function is non-fallible. Additionally it has arguments that match the data type, so the C compiler is able to type check the function arguments.

Another neat feature, both `head` and `item` are pointers to the message_t type. This makes it reasonably clear to the user that there is nothing special about the "head" of this linked list. If we desired to append to the end of the linked list instead of pushing to the front we could do this:

    void receive_message(int id, size_t len, uint8_t* data)
    {
        static message_t** last_m = NULL;

        message_t* m = malloc(sizeof(message_t));

        if (m) {
            *m = (message_t){
                .id = id,
                .len = len,
                .data = data,
            };

            if (!last_m) last_m = &messages;

            message_push(last_m, m);
            last_m = &m->next;
        }
    }

This uses `last_m` to save a reference to the NULL pointer at the end of the Linked List. This way we can append to the Linked List without iterating over the entire list each time a message is received.


Under the Hood
--------------

In most programming languages, a Templating System like what is shown above would be simple presented to you, and you would be told to go ahead and use it. In this case we have the unique opportunity to dig in and see directly how this is implemented, because it is done entirely by the C preprocessor. As you will see, it's not even that crazy preprocessor _Magic_.

Examining the `LinkedList.h` file you will see this at the start of the file

    #ifndef __LINKED_LIST_H__
    #define __LINKED_LIST_H__

    #include <stddef.h>

    /* Concatenate preprocessor tokens A and B without expanding macro definitions
       (however, if invoked from a macro, macro arguments are expanded).
     */
    #define PPCAT_NX(A, B) A ## B

    /* Concatenate preprocessor tokens A and B after macro-expanding them.
     */
    #define PPCAT(A, B) PPCAT_NX(A, B)

    /* Extract an element of type (member_type) at offset (offset) in the structure pointed to by (ptr)
     */
    #define offsetin(ptr, offset, member_type) *((member_type*)((char*)ptr + offset))

    typedef void ** LL_TYPE;
    typedef int (*LL_COMPARE)(void *, void *);
    typedef struct {
        void * n;
    } LL_ITERATOR;

    int ll_length(LL_TYPE head, size_t o);
    void ll_push(LL_TYPE head, size_t o, void * item);
    void * ll_pop(LL_TYPE head, size_t o);
    void ll_append(LL_TYPE head, size_t o, void * item);
    void * ll_deduct(LL_TYPE head, size_t o);
    void * ll_remove(LL_TYPE head, size_t o, void * item);
    void * ll_find(const LL_TYPE head, size_t o, void * item, LL_COMPARE);
    void ll_merge(LL_TYPE head, size_t o, void * list, LL_COMPARE);
    void ll_sort(LL_TYPE head, size_t o, LL_COMPARE);
    void ll_each(const LL_TYPE head, size_t o, void (*fn)(void *, void *), void * param);

    LL_ITERATOR ll_iter(const LL_TYPE head, size_t o);
    void * ll_iter_val(LL_ITERATOR* it, size_t o);
    void ll_iter_next(LL_ITERATOR* it, size_t o);

    #endif // !__LINKED_LIST_H__

None of that is really atypical for a C header file, but I will break it down to be thorough. 
* The lines containing `__LINKED_LIST_H__` are an old fashioned version of `#pragma once` which simply masks out the contained code in the case that the header is included multiple times.
* `#include <stddef.h>` is used for `size_t` and `offsetof()`. The convention used in all of my C projects is to only include headers that contain type definitions within other headers. This reduces code coupling. This means including <stddef.h>, <stdint.h>, <stdbool.h>, or some custom <typedefs.h> file would be fine here, but never <stdio.h>, or <all_functions.h> etc.
* the macros `PPCAT_NX` and `PPCAT` are a very common preprocessor convention for concatenating symbols
* the `offsetin(ptr, offset, type)` macro is intended to be a reciprocal of the Standard C `size_t offsetof(type, member)` macro. Such that `a.v == offsetin(&a, offsetof(struct s, v), int)`
* `LL_TYPE` By convention, almost all functions defined in this library have the same type for the first argument. Not all functions actually need the pointer pointer, but it is confusing to call `ll_length(head)`, when all the other functions need `ll_push(&head)`
* `LL_COMPARE` This is a function pointer prototype, for the sorting functions.
* `LL_ITERATOR` That's right, iterators in C. We will discuss that later.
* All the generic functions are prefixed with `ll_` to avoid namespace collisions. Most take `LL_TYPE` as there first argument, and `size_t o` as their second argument

Now the rest of the header file starts with this:

    #if defined(TEMPLATE_PREFIX) && defined(TEMPLATE_STRUCT) && defined(TEMPLATE_STRUCT)
    
    /*shorter versions of the template definitions*/
    #define PREFIX PPCAT(TEMPLATE_PREFIX, _)
    #define STRUCT TEMPLATE_STRUCT
    #define OFFSET offsetof(STRUCT, next)

So everything after these lines requires that the user has supplied all the required information for the Template System to work.

Next we have this:

    #define FUNCTION(name) PPCAT(PREFIX, name)

which is used as a shorthand way of defining a function with the user supplied prefix and an underscore to separate the prefix and the function name.

Next we have a bunch of `static inline` functions like this one:

    /* push item to the beginning of the linked list
       Complexity O(1)
     */
    static inline void FUNCTION(push)(STRUCT ** head, STRUCT * item)
    {
        ll_push((LL_TYPE)head, OFFSET, item);
    }

The `static inline` tells the compiler it doesn't have to make this function available to other compilation units (files), which prevents multiple definition errors, but also it encourages the compiler inline the function. Effectively this can be considered to be a Macro, but it has some nicer features than a macro, including typed arguments, easier preprocessor concatenating of the name, and you can get a function pointer to it if you need to.

Note that `OFFSET` is a constant at compile time. In fact, depending on your compiler, this entire function can have zero impact on the compiled binary over calling the generic version directly.

At the end of the file you will see this:

    /* un-define all the template magic */
    #undef PREFIX
    #undef STRUCT
    #undef OFFSET

    #undef TEMPLATE_PREFIX 
    #undef TEMPLATE_STRUCT
    #undef TEMPLATE_STRUCT

    #undef FUNCTION

    #endif // TEMPLATE

This cleans up the TEMPLATE `#defines`'s generated by the file, but also those used to configure it. This way you can easily apply the template to multiple structures in your C file, just define the TEMPLATE's and re-include the `LinkedList.h` file once for each one.

You even can apply the same TEMPLATE multiple times to the same struct. This can be useful if you want the struct to be present in multiple lists at the same time.

Going Deeper
------------

Now open the `LinkedList.c` file. You will see, predictably, the definitions of all the generic functions (with `ll_` prefix) that were prototyped in the header file. For instance here is the ll_push function:

    /* push item to the beginning of the linked list
       Complexity O(1)
     */
    void ll_push(LL_TYPE head, size_t o, void * item)
    {
        NEXT(item) = *head;
        *head = item;
    }

Note how much more straight forward this implementations is when compared to the void pointer example with the call to malloc!

Anyway, what is this `NEXT(item)` thing? Well at the top of the C file you will see this:

    /* assumes variable "o" is the offset where the void * NEXT element is located */
    #define NEXT(x) offsetin(x, o, void *)

This is how the C code accesses the `NEXT` member of the nodes in the datastructure. Note that the `o` parameter doesn't look like it is used in the function body, but the `NEXT` macro does actually use it. Other than that the function definition is not surprising.

Granted `ll_push` is the shortest function in the library, but the rest of them really are quite simple as well. There isn't any memory allocation, in fact the only system header file used is `stddef.h` so the code should be incredibly portable.

Speaking about portability though, there are some important comments here. The C Standard doesn't guarantee that all memory addresses will survive a round trip from type pointer to void pointer, and back. You should be fine with memory allocated in RAM, particularly when it was received from `malloc` (as a void pointer). Additionally the `FUNCTION(each)` performs a function pointer cast, from `void (*)(STRUCT *, void *)` to `void (*)(void *, void *)`. This isn't guaranteed by the C Standard, but this function really isn't that useful anyway considering you could more easily use the Iterator.

The Iterator
------------

As promised the `LinkedList` library also includes an iterator, which can be used as follows:

    LL_ITERATOR it;
    message_t* m;
    
    for (it = message_iter(&messages); m = message_iter_val(&it); message_iter_next(&it))
    {
        printf("%d, len:%d:, %s\n", m->id, m->len, m->data);
    }

Now that is nice, but it's a lot to type every time you want to run through your list, particularly it's annoying that the `message_iter` keyword is duplicated three times in the for loop. A shorthand is provided in the `LinkedList.h` file that allows for the following:

    LL_ITERATOR it;
    message_t* m;
    
    for_each(message, &messages, m, it)
    {
        printf("%d, len:%d:, %s\n", m->id, m->len, m->data);
    }

That is a bit cleaner looking, but it's important to note that `for_each` is just a macro, and it simply results in the exact same code as the first example does.

Using C99, this definition could be changed to the following:

    message_t* m;
    
    for (LL_ITERATOR it = message_iter(&messages); m = message_iter_val(&it); message_iter_next(&it))
    {
        printf("%d, len:%d:, %s\n", m->id, m->len, m->data);
    }

That may look worse, but it allows the `for_each` macro to be reduced to only 3 parameters:

    message_t* m;
    
    for_each(message, &messages, m)
    {
        printf("%d, len:%d:, %s\n", m->id, m->len, m->data);
    }

The downside of this is that if you break out of the loop, then desire to check the `it` parameter you can't because it has fallen out of scope. I am working on a way to offer both alternatives using a varidic macro, but that isn't ready yet.

Checking the preprocessor output
--------------------------------

I had that rant about using the preprocessor output to develop and debug preprocessor macros, so it would be a missed opportunity not to demo that now. Lets start with a sample of code to hand to our preprocessor. We will just collect the various samples we've already been using into one file:

    #include <stdint.h>
    #include <stddef.h>
    #include <stdlib.h>

    typedef struct message_t {
        struct message_t* next;
        int id;
        size_t len;
        uint8_t* data;
    } message_t;

    #define TEMPLATE_PREFIX message
    #define TEMPLATE_STRUCT message_t
    #define TEMPLATE_NEXT next
    #include "LinkedList.h"

    message_t * messages;

    void receive_message(int id, size_t len, uint8_t* data)
    {
        static message_t** last_m = NULL;

        message_t* m = malloc(sizeof(message_t));

        if (m) {
            *m = (message_t){
                .id = id,
                .len = len,
                .data = data,
            };

            if (!last_m) last_m = &messages;

            message_push(last_m, m);
            last_m = &m->next;
        }
    }

    void print_messages(void)
    {
        LL_ITERATOR it;
        message_t* m;

        for_each(message, &messages, m, it)
        {
            printf("%d, len:%d:, %s\n", m->id, m->len, m->data);
        }
    }

please first note that the <stdint.h> and <stddef.h> at the top will also be expanded by the Preprocessor. This results in a bunch of code at the start which I have trimmed out in the following preprocessed sample. Additionally for brevity, I've stripped the result down by removing blank lines, and some of the additional functions in the file.

    typedef struct message_t {
        struct message_t* next;
        int id;
        size_t len;
        uint8_t* data;
    } message_t;

    #line 1 "C:\\Projects\\TemplateDataStructs\\LinkedList\\LinkedList.h"

    typedef void ** LL_TYPE;
    typedef int (*LL_COMPARE)(void *, void *);
    typedef struct {
        void * n;
    } LL_ITERATOR;

    int ll_length(LL_TYPE head, size_t o);
    void ll_push(LL_TYPE head, size_t o, void * item);
    
    /* some function prototypes omitted */

    LL_ITERATOR ll_iter(const LL_TYPE head, size_t o);
    void * ll_iter_val(LL_ITERATOR* it, size_t o);
    void ll_iter_next(LL_ITERATOR* it, size_t o);

    #line 43 "C:\\Projects\\TemplateDataStructs\\LinkedList\\LinkedList.h"

    static inline int message_length (message_t ** head)
    {
        return ll_length((LL_TYPE)head, ((size_t)&(((message_t*)0)->next)) );
    }

    static inline void message_push (message_t ** head, message_t * item)
    {
        ll_push((LL_TYPE)head, ((size_t)&(((message_t*)0)->next)) , item);
    }

    /* some static inline functions omitted */

    static inline LL_ITERATOR message_iter (message_t ** head)
    {
        return ll_iter((LL_TYPE)head, ((size_t)&(((message_t*)0)->next)) );
    }

    static inline message_t * message_iter_val (LL_ITERATOR* it)
    {
        return ll_iter_val(it, ((size_t)&(((message_t*)0)->next)) );
    }

    static inline void message_iter_next (LL_ITERATOR* it)
    {
        ll_iter_next(it, ((size_t)&(((message_t*)0)->next)) );
    }

    #line 191 "C:\\Projects\\TemplateDataStructs\\LinkedList\\LinkedList.h"

    #line 204 "C:\\Projects\\TemplateDataStructs\\LinkedList\\LinkedList.h"
    #line 16 "C:\\Projects\\TemplateDataStructs\\LinkedList\\Demo.c"

    message_t * messages;

    void receive_message(int id, size_t len, uint8_t* data)
    {
        static message_t** last_m = ((void *)0) ;

        message_t* m = malloc(sizeof(message_t));

        if (m) {
            *m = (message_t){
                .id = id,
                .len = len,
                .data = data,
            };

            if (!last_m) last_m = &messages;

            message_push(last_m, m);
            last_m = &m->next;
        }
    }

    void print_messages(void)
    {
        LL_ITERATOR it;
        message_t* m;

        for (it = message_iter(&messages); m = message_iter_val(&it); message_iter_next(&it))
        {
            printf("%d, len:%d:, %s\n", m->id, m->len, m->data);
        }
    }

What I really wanted to highlight here, is that the preprocessor output is essentially just C code. That should go without saying, but when you have a bug or typo in your preprocessor macros, the file you need to review is literally just C code which you already know how to read. This is in contrast to the kind of errors you can get from the C++ compiler when you have a syntax error which somehow causes the templating system to barf out a long and cryptic error message. Now to modern C++ compilers credit generally these error messages have been significantly improved, making this less of a problem. But my point is no mater how helpful the error messages are, you still have to develop a skill of sorts in reading and correcting these errors. If the error is instead shown to you as malformed C code, you can rely on your experience reading and writing C code to correct it. 


Reviewing the Assembly
-------------------------

We can go even deeper and quickly review the Assembly code that is generated by the C complier. I think this is important to do from time to time to get an understanding for what the compiler is doing. But I also want to showcase the minimal binary size overhead this Templating system has. For this we will look at just the print_messages function to keep it relatively brief.

Without optimizations, x86-64 gcc is producing this code:

    print_messages:
     push   rbp
     mov    rbp,rsp
     sub    rsp,0x10
     mov    edi,0x404028
     call   40115e <message_iter>
     mov    QWORD PTR [rbp-0x10],rax
     jmp    401292 <print_messages+0x4c>
     mov    rax,QWORD PTR [rbp-0x8]
     mov    rcx,QWORD PTR [rax+0x18]
     mov    rax,QWORD PTR [rbp-0x8]
     mov    rdx,QWORD PTR [rax+0x10]
     mov    rax,QWORD PTR [rbp-0x8]
     mov    eax,DWORD PTR [rax+0x8]
     mov    esi,eax
     mov    edi,0x402004
     mov    eax,0x0
     call   401030 <printf@plt>
     lea    rax,[rbp-0x10]
     mov    rdi,rax
     call   401192 <message_iter_next>
     lea    rax,[rbp-0x10]
     mov    rdi,rax
     call   401178 <message_iter_val>
     mov    QWORD PTR [rbp-0x8],rax
     cmp    QWORD PTR [rbp-0x8],0x0
     jne    40125e <print_messages+0x18>
     nop
     nop
     leave
     ret
    message_iter:
     push   rbp
     mov    rbp,rsp
     sub    rsp,0x10
     mov    QWORD PTR [rbp-0x8],rdi
     mov    rax,QWORD PTR [rbp-0x8]
     mov    rdi,rax
     call   401d9d <ll_iter>
     leave
     ret
    message_iter_val:
     push   rbp
     mov    rbp,rsp
     sub    rsp,0x10
     mov    QWORD PTR [rbp-0x8],rdi
     mov    rax,QWORD PTR [rbp-0x8]
     mov    rdi,rax
     call   401dae <ll_iter_val>
     leave
     ret
    message_iter_next:
     push   rbp
     mov    rbp,rsp
     sub    rsp,0x10
     mov    QWORD PTR [rbp-0x8],rdi
     mov    rax,QWORD PTR [rbp-0x8]
     mov    esi,0x0
     mov    rdi,rax
     call   401dbf <ll_iter_next>
     nop
     leave
     ret
    ll_iter:
     push   rbp
     mov    rbp,rsp
     mov    QWORD PTR [rbp-0x8],rdi
     mov    rax,QWORD PTR [rbp-0x8]
     mov    rax,QWORD PTR [rax]
     pop    rbp
     ret
    ll_iter_val:
     push   rbp
     mov    rbp,rsp
     mov    QWORD PTR [rbp-0x8],rdi
     mov    rax,QWORD PTR [rbp-0x8]
     mov    rax,QWORD PTR [rax]
     pop    rbp
     ret
    ll_iter_next:
     push   rbp
     mov    rbp,rsp
     mov    QWORD PTR [rbp-0x18],rdi
     mov    QWORD PTR [rbp-0x20],rsi
     mov    rax,QWORD PTR [rbp-0x18]
     mov    rdx,QWORD PTR [rax]
     mov    rax,QWORD PTR [rbp-0x20]
     add    rax,rdx
     mov    rax,QWORD PTR [rax]
     mov    QWORD PTR [rbp-0x8],rax
     mov    rax,QWORD PTR [rbp-0x18]
     mov    rdx,QWORD PTR [rbp-0x8]
     mov    QWORD PTR [rax],rdx
     nop
     pop    rbp
     ret

So the static inline functions were not inlined or folded in any way. Each function used in the C code is represented pretty much in the most verbose way possible. Lets try again with -O1

    print_messages:
     push   rbx
     sub    rsp,0x10
     mov    edi,0x404028
     call   4018a5 <ll_iter>
     mov    QWORD PTR [rsp+0x8],rax
     lea    rbx,[rsp+0x8]
     jmp    4011fd <print_messages+0x42>
     mov    rcx,QWORD PTR [rax+0x18]
     mov    rdx,QWORD PTR [rax+0x10]
     mov    esi,DWORD PTR [rax+0x8]
     mov    edi,0x402004
     mov    eax,0x0
     call   401030 <printf@plt>
     mov    esi,0x0
     mov    rdi,rbx
     call   4018ad <ll_iter_next>
     mov    rdi,rbx
     call   4018a9 <ll_iter_val>
     test   rax,rax
     jne    4011d6 <print_messages+0x1b>
     add    rsp,0x10
     pop    rbx
     ret
    ll_iter:
     mov    rax,QWORD PTR [rdi]
     ret
    ll_iter_val:
     mov    rax,QWORD PTR [rdi]
     ret
    ll_iter_next:
     mov    rax,QWORD PTR [rdi]
     mov    rax,QWORD PTR [rax+rsi*1]
     mov    QWORD PTR [rdi],rax
     ret

And presto! All the static inlines have disappeared. Additionally the iterator routines have collapsed to just a handful of instructions.

Now keep in mind that the functions prefixed with `ll_` are the generic versions of the library. These same functions will be used every time the datastructure library is used, no matter which data type you currently are using. This means your binary size will not continue to increase when you apply the template to more data types. Some have referred to this concept as the _thin template idiom_.

To analyze this a bit further. I moved the `next` member of the struct as follows:

    typedef struct message_t {
        int id;
        size_t len;
        uint8_t* data;
        struct message_t* next;
    } message_t;

The only notable change in the result was that the instruction `mov esi,0x0` just before the `call` to `ll_iter_next`, changed to `mov esi,0x18`. This instruction loads the `esi` register with the structure offset. If we had implemented this datastructure without the generics you would not need this offset to be loaded as an argument to a function. In other words the cost of using this Templated datastructure library, over a home baked solution is one additional instruction for each library function call.

Conclusion
----------

In summary, the C preprocessor can be used as a powerful templating system. The Template I have presented is a _thin template_ so you don't get a bloated binary full of similar template functions. The datastructure I have presented has zero hidden memory allocations. The memory used to store the datastructure resides withing the structure provided by the user, which means the pointers are typed making them easy to use without casts, and easy to inspect with a debugger. Finally the interface to the datastructure also uses typed function calls, meaning the compiler's type checker can help avoid mistakes.

The examples I have shown are for a Linked List datastructure, but I think it is clear that this Templating System could easily be reused for other datastructures. Armed with this new tool, perhaps it's now time for me to re-write that AVL Tree assignment.

Zachary Vander Klippe